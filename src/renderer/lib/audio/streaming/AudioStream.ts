import type { RingBuffer } from "@renderer/lib/audio/processing/RingBuffer";
import type { StagingBufferData } from "@renderer/lib/audio/processing/StagingBuffer";

import { PCMStream } from "@renderer/lib/audio/streaming/PCMStream";
import { getErrorMessage, log } from "@shared/utils/logger";

const CHANNEL_COUNT = 2;
const BYTES_PER_SAMPLE = Float32Array.BYTES_PER_ELEMENT;

export interface TrackTransition {
    /** Preloaded samples from the next track. */
    stagingData: StagingBufferData;

    /** Streaming URL for the track following the staging buffer. */
    nextTrackUrl: string;
}

export interface AudioStreamCallbacks {
    /**
     * Called when the current PCMStream exhausts cleanly — all of the track's
     * PCM has been written into the ring buffer, but the worklet may not have
     * consumed it yet.
     *
     * The `samplesWritten` parameter is the total number of samples per channel
     * that were written for the completed track. Use this to compute the
     * cumulative offset for the next track in the timeline.
     *
     * Return a `TrackTransition` to continue into the next track, or `null`
     * if the queue is exhausted.
     */
    onWriteEnd: (samplesWritten: number) => TrackTransition | null;

    /**
     * Called when a stream fails to open, the track was not found, the server
     * was unreachable, or the request was rejected.
     */
    onError: () => void;
}

/**
 * Reads decoded PCM from a streaming HTTP source and writes it continuously
 * into the ring buffer.
 *
 * AudioStream is the active pipeline for the current track. It owns the
 * PCMStream and is responsible for the track boundary handoff.
 *
 * When the current stream exhausts, it writes the preloaded staging buffer
 * samples directly into the ring buffer, then opens a continuation stream for
 * the next track and keeps writing without ever interrupting the write loop.
 */
export class AudioStream {
    private readonly ringBuffer: RingBuffer;
    private readonly callbacks: AudioStreamCallbacks;

    private stream: PCMStream | null = null;

    /**
     * The total number of samples (per channel) written since the stream
     * started or since the last callback. Reset to 0 when onWriteEnd is called,
     * so each callback invocation reports samples for exactly one track.
     */
    private samplesWritten = 0;

    /**
     * Remainder bytes from the previous chunk that didn't align to a complete
     * stereo frame (8 bytes: 4 bytes * 2 channels).
     *
     * HTTP chunks don't respect sample boundaries. A chunk may end mid-frame,
     * leaving 1–7 stray bytes. These are prepended to the next chunk before
     * converting to Float32.
     */
    private remainderBytes: Uint8Array = new Uint8Array(0);

    /**
     * Set to true by `abort()`. Causes the write loop to exit cleanly on its
     * next iteration without surfacing any error.
     */
    private aborted = false;

    constructor(ringBuffer: RingBuffer, callbacks: AudioStreamCallbacks) {
        this.ringBuffer = ringBuffer;
        this.callbacks = callbacks;
    }

    /**
     * Opens a stream to the given URL and begins writing PCM into the ring
     * buffer. Returns immediately — the write loop runs asynchronously.
     *
     * If the stream fails to open, `onError` is called — there is no way to
     * recover from an open failure. Mid-stream failures are non-fatal and exit
     * silently, letting the worklet output silence.
     *
     * If the stream exhausts cleanly, `onWriteEnd` is called to get the next
     * track's staging data and continuation URL. If `onWriteEnd` returns null,
     * the loop exits quietly.
     *
     * It is safe to call `abort()` at any point after `start()`.
     */
    async start(url: string): Promise<void> {
        this.stream = new PCMStream();

        const openResult = await this.stream.open(url);
        if (!openResult.success) {
            if (this.aborted) return;
            log(openResult.message, "AudioStream", "error");
            this.callbacks.onError();
            return;
        }

        await this.runWriteLoop();
    }

    /**
     * Aborts the active stream and stops the write loop.
     *
     * Safe to call at any point — before, during, or after `start()`. The
     * remainder bytes are reset so a subsequent `start()` begins clean.
     */
    abort(): void {
        this.aborted = true;
        this.stream?.abort();
        this.stream = null;
        this.remainderBytes = new Uint8Array(0);
        this.samplesWritten = 0;
    }

    /**
     * The core write loop. Reads chunks from the current PCMStream, converts
     * and deinterleaves them, and writes into the ring buffer.
     *
     * When the stream exhausts, calls `onWriteEnd` to get the staging buffer
     * and continuation URL. Writes the staging samples first, then opens a
     * new PCMStream for the continuation and loops back.
     *
     * Exits when `onWriteEnd` returns null (queue exhausted) or `abort()` is
     * called.
     */
    private async runWriteLoop(): Promise<void> {
        while (!this.aborted && this.stream !== null) {
            try {
                for await (const chunk of this.stream) {
                    if (this.aborted) return;
                    await this.writeChunk(chunk);
                }
            } catch (err) {
                if (this.aborted) return;
                // non-fatal — stop writing and let the worklet output silence
                log(getErrorMessage(err), "AudioStream", "warning");
                return;
            }

            // stream exhausted cleanly — current track is done
            this.stream = null;
            this.remainderBytes = new Uint8Array(0);

            if (this.aborted) return;

            const completedSamples = this.samplesWritten;
            this.samplesWritten = 0;

            const transition = this.callbacks.onWriteEnd(completedSamples);
            if (transition === null) return;

            // write the preloaded staging samples directly into the ring
            // buffer — these are the first ~5s of the next track, already
            // deinterleaved and ready. this is the gapless boundary.
            await this.writeStagingBuffer(transition.stagingData);
            if (this.aborted) return;

            // open the continuation stream from where the staging buffer left
            // off and keep writing
            this.stream = new PCMStream();
            const openResult = await this.stream.open(transition.nextTrackUrl);
            if (!openResult.success) {
                if (this.aborted) return;
                log(openResult.message, "AudioStream", "error");
                this.callbacks.onError();
                return;
            }
        }
    }

    /**
     * Converts a raw f32le byte chunk to deinterleaved Float32 samples and
     * writes them into the ring buffer.
     *
     * Handles chunk boundaries that don't align to a full stereo frame by
     * carrying remainder bytes forward to the next call.
     */
    private async writeChunk(chunk: Uint8Array): Promise<void> {
        // prepend any leftover bytes from the previous chunk
        let bytes: Uint8Array;
        if (this.remainderBytes.byteLength > 0) {
            bytes = new Uint8Array(
                this.remainderBytes.byteLength + chunk.byteLength,
            );
            bytes.set(this.remainderBytes);
            bytes.set(chunk, this.remainderBytes.byteLength);
            this.remainderBytes = new Uint8Array(0);
        } else {
            bytes = chunk;
        }

        const frameSize = CHANNEL_COUNT * BYTES_PER_SAMPLE;
        const frameCount = Math.floor(bytes.byteLength / frameSize);
        const leftover = bytes.byteLength % frameSize;

        if (leftover > 0)
            this.remainderBytes = bytes.slice(bytes.byteLength - leftover);

        if (frameCount === 0) return;

        // reinterpret as f32 samples. if the buffer isn't 4-byte aligned (can
        // happen after the remainderBytes concatenation above), copy into a fresh
        // ArrayBuffer first — Float32Array requires alignment.
        const alignedByteCount = frameCount * frameSize;
        const needsCopy = bytes.byteOffset % BYTES_PER_SAMPLE !== 0;
        const source = needsCopy ? bytes.slice(0, alignedByteCount) : bytes;

        const interleaved = new Float32Array(
            source.buffer,
            source.byteOffset,
            frameCount * CHANNEL_COUNT,
        );

        // deinterleave: [L0, R0, L1, R1, ...] → left[], right[]
        const left = new Float32Array(frameCount);
        const right = new Float32Array(frameCount);
        for (let i = 0; i < frameCount; i++) {
            left[i] = interleaved[i * CHANNEL_COUNT];
            right[i] = interleaved[i * CHANNEL_COUNT + 1];
        }

        await this.writeWithBackpressure(left, right, frameCount);
    }

    /**
     * Writes the preloaded staging buffer samples into the ring buffer.
     *
     * The staging buffer is already deinterleaved, so no conversion is needed.
     * This is the hot path at the track boundary — we want to get these samples
     * in as fast as possible so the worklet sees no gap.
     */
    private async writeStagingBuffer(
        stagingData: StagingBufferData,
    ): Promise<void> {
        const { left, right, totalSamples } = stagingData;
        await this.writeWithBackpressure(
            left.subarray(0, totalSamples),
            right.subarray(0, totalSamples),
            totalSamples,
        );
    }
    /**
     * Writes a frame of PCM samples to the ring buffer, retrying every 10ms
     * until space is available or the stream is aborted.
     */
    private async writeWithBackpressure(
        left: Float32Array,
        right: Float32Array,
        frames: number,
    ): Promise<void> {
        while (!this.aborted) {
            if (this.ringBuffer.write(left, right, frames)) {
                this.samplesWritten += frames;
                return;
            }

            await sleep(10);
        }
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
