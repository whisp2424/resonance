import type { RingBuffer } from "@renderer/lib/audio/processing/RingBuffer";
import type { Result } from "@shared/types/result";

import { PCMStream } from "@renderer/lib/audio/streaming/PCMStream";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";

const CHANNEL_COUNT = 2;
const BYTES_PER_SAMPLE = Float32Array.BYTES_PER_ELEMENT;

export interface AudioStreamCallbacks {
    /**
     * Called when the current PCMStream exhausts cleanly.
     *
     * The `framesWritten` parameter is the total number of PCM frames written
     * for the completed track.
     */
    onWriteEnd: (framesWritten: number) => void;

    /**
     * Called when a stream fails to open, the track was not found, the server
     * was unreachable, or the request was rejected.
     */
    onError: (message: string, framesWritten: number) => void;
}

export type AudioStreamStartResult = Result<
    "started" | "ended",
    "failed" | "superseded"
>;

/**
 * Reads decoded PCM from a streaming HTTP source and writes it continuously
 * into the ring buffer.
 *
 * AudioStream is the active PCM writer for a single track stream session.
 * It owns one PCMStream at a time and serializes all writes into the ring
 * buffer until the stream ends, errors, or is superseded.
 */
export class AudioStream {
    private readonly ringBuffer: RingBuffer;
    private readonly callbacks: AudioStreamCallbacks;

    /**
     * Serializes session start requests so only one write loop can exist at a
     * time.
     */
    private sessionQueue: Promise<void> = Promise.resolve();

    /** The most recently requested session start. */
    private latestSessionId = 0;

    /** The currently running write loop, if any. */
    private writeLoopPromise: Promise<void> | null = null;

    private stream: PCMStream | null = null;

    /**
     * The total number of PCM frames written since the stream started or since
     * the last callback. Reset to 0 when `onWriteEnd` is called, so each
     * callback invocation reports frames for exactly one track.
     */
    private framesWritten = 0;

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

    /** True once the current session has written at least one PCM frame. */
    private sessionHasWritten = false;

    /** Resolves the pending session-start handshake. */
    private sessionStartResolve:
        | ((result: AudioStreamStartResult) => void)
        | null = null;

    constructor(ringBuffer: RingBuffer, callbacks: AudioStreamCallbacks) {
        this.ringBuffer = ringBuffer;
        this.callbacks = callbacks;
    }

    /**
     * Opens a stream to the given URL and begins writing PCM into the ring
     * buffer.
     *
     * Resolves once the session has either been superseded, failed to open, or
     * successfully written its first PCM frames into the ring buffer.
     *
     * Returns `started` once the stream opened and wrote its first PCM frames.
     * Returns `ended` if the stream ended cleanly before any PCM frame was
     * written. Returns an error result if the start was superseded or failed.
     *
     * If the stream fails to open, `onError` is called. Mid-stream failures are
     * also reported through `onError`, while the worklet continues outputting
     * whatever audio is already buffered.
     *
     * If the stream exhausts cleanly, `onWriteEnd` is called and the loop
     * exits quietly.
     *
     * It is safe to call `abort()` at any point after `start()`.
     */
    async start(url: string): Promise<AudioStreamStartResult> {
        // preempt the currently active or opening session immediately so the
        // latest request wins even if an older fetch is still opening.
        this.abortActiveSession();

        const sessionId = ++this.latestSessionId;

        const startTask = this.sessionQueue.then(() =>
            this.startSession(sessionId, url),
        );

        this.sessionQueue = startTask.then(
            () => {},
            () => {},
        );

        return startTask;
    }

    /**
     * Aborts the active stream and waits for the write loop to fully stop.
     *
     * Safe to call at any point — before, during, or after `start()`. The
     * remainder bytes are reset so a subsequent `start()` begins clean.
     */
    async abort(): Promise<void> {
        this.latestSessionId++;
        const activeLoop = this.writeLoopPromise;
        this.cancel();
        if (activeLoop) await activeLoop;
    }

    /**
     * Synchronously cancels the active or opening session.
     *
     * This prevents any further writes immediately, while allowing callers to
     * separately await `abort()` if they need full loop shutdown.
     */
    cancel(): void {
        this.latestSessionId++;
        this.abortActiveSession();
    }

    /**
     * Aborts the active or opening session without invalidating future queued
     * starts.
     */
    private abortActiveSession(): void {
        this.aborted = true;
        this.stream?.abort();
        this.stream = null;
        this.remainderBytes = new Uint8Array(0);
        this.framesWritten = 0;
        if (!this.sessionHasWritten) {
            this.resolveSessionStart(
                error("Stream start was superseded", "superseded"),
            );
        }
    }

    /**
     * Stops any active session and waits for its write loop to fully exit.
     */
    private async stopActiveSession(): Promise<void> {
        const activeLoop = this.writeLoopPromise;
        this.abortActiveSession();
        if (activeLoop) await activeLoop;
    }

    /**
     * Starts a new streaming session after the previous one has fully stopped.
     */
    private async startSession(
        sessionId: number,
        url: string,
    ): Promise<AudioStreamStartResult> {
        if (sessionId !== this.latestSessionId)
            return error("Stream start was superseded", "superseded");

        await this.stopActiveSession();

        if (sessionId !== this.latestSessionId)
            return error("Stream start was superseded", "superseded");

        this.aborted = false;
        this.remainderBytes = new Uint8Array(0);
        this.framesWritten = 0;
        this.sessionHasWritten = false;

        const didStart = new Promise<AudioStreamStartResult>((resolve) => {
            this.sessionStartResolve = resolve;
        });

        const stream = new PCMStream();
        this.stream = stream;

        const openResult = await stream.open(url);
        if (!openResult.success) {
            if (this.aborted || this.stream !== stream)
                return error("Stream start was superseded", "superseded");
            log(openResult.message, "AudioStream", "error");
            this.callbacks.onError(openResult.message, this.framesWritten);
            this.stream = null;
            this.resolveSessionStart(error(openResult.message, "failed"));
            return error(openResult.message, "failed");
        }

        if (sessionId !== this.latestSessionId || this.stream !== stream) {
            stream.abort();
            this.resolveSessionStart(
                error("Stream start was superseded", "superseded"),
            );

            return error("Stream start was superseded", "superseded");
        }

        const writeLoop = this.runWriteLoop(sessionId, stream).finally(() => {
            if (this.writeLoopPromise === writeLoop)
                this.writeLoopPromise = null;

            if (!this.sessionHasWritten) {
                this.resolveSessionStart(
                    this.aborted || sessionId !== this.latestSessionId
                        ? error("Stream start was superseded", "superseded")
                        : this.framesWritten === 0
                          ? ok("ended")
                          : error(
                                "Stream failed before writing any audio",
                                "failed",
                            ),
                );
            }
        });

        this.writeLoopPromise = writeLoop;
        return didStart;
    }

    /**
     * The core write loop. Reads chunks from the current PCMStream, converts
     * and deinterleaves them, and writes into the ring buffer.
     *
     * Exits when the stream ends, errors, or `abort()` is called.
     */
    private async runWriteLoop(
        sessionId: number,
        initialStream: PCMStream,
    ): Promise<void> {
        try {
            for await (const chunk of initialStream) {
                if (this.aborted || sessionId !== this.latestSessionId) return;
                await this.writeChunk(chunk);
            }
        } catch (err) {
            if (this.aborted || sessionId !== this.latestSessionId) return;
            const message = getErrorMessage(err);
            log(message, "AudioStream", "warning");
            this.callbacks.onError(message, this.framesWritten);
            if (!this.sessionHasWritten) {
                this.resolveSessionStart(error(message, "failed"));
            }
            return;
        }

        this.stream = null;
        this.remainderBytes = new Uint8Array(0);

        if (this.aborted || sessionId !== this.latestSessionId) return;

        const completedFrames = this.framesWritten;
        this.framesWritten = 0;

        this.callbacks.onWriteEnd(completedFrames);
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
        // happen after the remainderBytes concatenation above), copy into a
        // fresh ArrayBuffer first — Float32Array requires alignment.
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
     * Writes PCM frames to the ring buffer, retrying every 10ms until the full
     * chunk has been accepted or the stream is aborted.
     *
     * The ring buffer may accept only part of the chunk when space is tight,
     * so we keep advancing through the remaining tail instead of waiting for a
     * single all-or-nothing write.
     */
    private async writeWithBackpressure(
        left: Float32Array,
        right: Float32Array,
        frames: number,
    ): Promise<void> {
        if (frames <= 0) return;

        let offset = 0;

        while (!this.aborted) {
            const writtenFrames = this.ringBuffer.write(
                left.subarray(offset, frames),
                right.subarray(offset, frames),
                frames - offset,
            );

            if (writtenFrames > 0) {
                if (!this.sessionHasWritten) {
                    this.sessionHasWritten = true;
                    this.resolveSessionStart(ok("started"));
                }

                this.framesWritten += writtenFrames;
                offset += writtenFrames;

                if (offset >= frames) return;
            } else {
                await sleep(10);
            }

            if (offset >= frames) return;
        }
    }

    private resolveSessionStart(result: AudioStreamStartResult): void {
        this.sessionStartResolve?.(result);
        this.sessionStartResolve = null;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
