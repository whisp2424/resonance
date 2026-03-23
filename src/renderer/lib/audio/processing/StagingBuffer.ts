import type { Result } from "@shared/types/result";

import { PCMStream } from "@renderer/lib/audio/streaming/PCMStream";
import { error, ok } from "@shared/types/result";
import { getErrorMessage } from "@shared/utils/logger";

const CHANNEL_COUNT = 2;

/** Number of seconds to preload from the next track. */
const PRELOAD_SECONDS = 5;

/** Number of bytes per f32le sample. */
const BYTES_PER_SAMPLE = Float32Array.BYTES_PER_ELEMENT;

export interface StagingBufferData {
    /** Deinterleaved left channel samples, valid up to `totalSamples`. */
    left: Float32Array;

    /** Deinterleaved right channel samples, valid up to `totalSamples`. */
    right: Float32Array;

    /**
     * Number of samples written per channel.
     *
     * Used as the slice boundary when reading from `left` and `right`,
     * and computing the resume offset using
     * `offset = totalSamples / sampleRate`.
     */
    totalSamples: number;

    /**
     * True once the preload target has been reached or the track ended before
     * the target — whichever comes first.
     *
     * AudioStream should check this before consuming the buffer to avoid
     * reading a partially filled window. In practice, `load()` resolves only
     * after this is true, so callers using `await load()` never read false.
     */
    isComplete: boolean;
}

/**
 * Preloads the first few seconds of the next track into deinterleaved
 * channel buffers, ensuring AudioStream has samples ready to write into the
 * ring buffer the moment the current track ends.
 *
 * StagingBuffer is a one-shot preloader. It fills once, exposes the result,
 * and is discarded. It owns its PCMStream internally — the caller passes only
 * a URL.
 *
 * The server streams raw f32le stereo PCM, interleaved as [L, R, L, R, ...].
 * StagingBuffer deinterleaves into separate Float32Arrays as it reads so that
 * AudioStream can write each channel directly into the ring buffer with no
 * extra work at the boundary.
 */
export class StagingBuffer {
    private readonly targetSamples: number;
    private readonly stream: PCMStream;

    /**
     * Remainder bytes from the previous chunk that didn't align to a full
     * interleaved frame (`CHANNEL_COUNT * BYTES_PER_SAMPLE bytes`).
     *
     * f32le PCM arrives as raw bytes. HTTP chunks don't respect sample
     * boundaries, so a chunk may end mid-frame. We carry the leftover bytes
     * forward and prepend them to the next chunk.
     */
    private remainderBytes: Uint8Array = new Uint8Array(0);

    readonly data: StagingBufferData;

    constructor(sampleRate: number) {
        this.targetSamples = sampleRate * PRELOAD_SECONDS;
        this.stream = new PCMStream();

        this.data = {
            left: new Float32Array(this.targetSamples),
            right: new Float32Array(this.targetSamples),
            totalSamples: 0,
            isComplete: false,
        };
    }

    /**
     * Opens a stream to the given URL and fills the staging buffer up to the
     * preload target.
     *
     * Resolves once the target is reached or the track ends — whichever comes
     * first. After this resolves successfully, `data.isComplete` is true and
     * `data.totalSamples` reflects how many samples per channel were written.
     */
    async load(url: string): Promise<Result<void, "not_found" | "aborted">> {
        const openResult = await this.stream.open(url);
        if (!openResult.success) {
            if (openResult.error === "not_found")
                return error(openResult.message, "not_found");
            if (openResult.error === "aborted")
                return error(openResult.message, "aborted");
            return error(openResult.message);
        }

        try {
            for await (const chunk of this.stream) {
                this.writeChunk(chunk);
                if (this.data.totalSamples >= this.targetSamples) break;
            }
        } catch (err) {
            const message = getErrorMessage(err);
            if (message.includes("aborted")) return error(message, "aborted");
            return error(message);
        } finally {
            this.stream.close();
        }

        this.data.isComplete = true;
        return ok(undefined);
    }

    /**
     * Aborts the preload mid-flight and discards accumulated data.
     *
     * Safe to call at any point — before, during, or after `load()`. After
     * `abort()`, this instance should be discarded.
     */
    abort(): void {
        this.stream.abort();
    }

    /**
     * Consumes a raw f32le byte chunk from the stream, deinterleaves the
     * samples, and writes them into the left and right channel buffers.
     *
     * Handles chunk boundaries that don't align to a full interleaved frame
     * by carrying remainder bytes forward to the next call.
     */
    private writeChunk(chunk: Uint8Array): void {
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

        // carry forward any bytes that don't form a complete frame
        if (leftover > 0)
            this.remainderBytes = bytes.slice(bytes.byteLength - leftover);

        if (frameCount === 0) return;

        // reinterpret the aligned byte region as f32 samples.
        // the buffer may not be aligned to a 4-byte boundary if it was
        // constructed via concatenation above, so we copy into a fresh
        // ArrayBuffer to guarantee alignment before creating the Float32Array.
        const needsCopy = bytes.byteOffset % BYTES_PER_SAMPLE !== 0;
        const source = needsCopy
            ? bytes.slice(0, frameCount * frameSize)
            : bytes;

        const samples = new Float32Array(
            source.buffer,
            source.byteOffset,
            frameCount * CHANNEL_COUNT,
        );

        // deinterleave: [L0, R0, L1, R1, ...] → left[], right[]
        const { left, right, totalSamples } = this.data;
        const capacity = this.targetSamples;
        const available = capacity - totalSamples;
        const toWrite = Math.min(frameCount, available);

        for (let i = 0; i < toWrite; i++) {
            left[totalSamples + i] = samples[i * CHANNEL_COUNT];
            right[totalSamples + i] = samples[i * CHANNEL_COUNT + 1];
        }

        this.data.totalSamples += toWrite;
    }
}
