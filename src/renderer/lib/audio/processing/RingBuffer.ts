const CHANNEL_COUNT = 2;
const BUFFER_SECONDS = 20;

const WRITE_HEAD = 0;
const READ_HEAD = 1;

/**
 * A counter that increments every time the buffer is flushed.
 *
 * The audio thread checks this before and after reading to ensure it doesn't
 * overwrite the newly flushed read head position if a flush happens mid-read.
 */
const FLUSH_COUNT = 2;

/**
 * Monotonically increasing count of frames consumed by the audio thread.
 *
 * Unlike READ_HEAD, this never wraps during normal playback, so it can be
 * used as a stable transport clock by the main thread.
 */
const TRANSPORT_FRAME = 0;

/**
 * A ring buffer for streaming decoded audio between the main thread and the
 * audio worklet.
 *
 * Audio data lives in a fixed-size circular array in shared memory. The main
 * thread writes decoded PCM samples into it, and the worklet reads from it on
 * the audio thread. Because the memory is shared, no copying occurs between
 * threads — the worklet always reads exactly what the main thread wrote.
 *
 * "Circular" means that when we reach the end of the array, we wrap back
 * around to the beginning. This lets us reuse a fixed block of memory
 * indefinitely, rather than allocating new memory for every chunk of audio.
 *
 * The buffer stores channels separately — all left samples first, then all
 * right samples — so the worklet can read each channel directly without any
 * extra overhead.
 */
export class RingBuffer {
    /**
     * The sample rate this buffer was created for, derived from the
     * AudioContext.
     */
    readonly sampleRate: number;

    /**
     * The maximum number of samples per channel this buffer can hold at once.
     *
     * Equivalent to `BUFFER_SECONDS` seconds of audio at the given sample rate.
     */
    readonly capacity: number;

    /**
     * The shared memory block holding the actual PCM samples.
     *
     * Passed to the worklet on initialization so both threads see the same
     * data.
     */
    readonly channelData: SharedArrayBuffer;

    /**
     * A tiny shared memory block holding three integers: the write head,
     * the read head, and a flush counter.
     *
     * Both threads use these to coordinate reading and writing.
     */
    readonly stateBuffer: SharedArrayBuffer;

    /**
     * A shared 64-bit counter holding the transport frame.
     *
     * The audio thread increments this on every successful read. The main
     * thread reads it to derive playback progress without relying on the
     * circular read head.
     */
    readonly transportBuffer: SharedArrayBuffer;

    /**
     * Float32Array views into channelData — one per channel.
     *
     * `channels[0]` is the left channel, `channels[1]` is the right channel.
     *
     * These are just views into the SharedArrayBuffer, not copies.
     */
    private readonly channels: Float32Array[];

    /**
     * An Int32Array view into the state buffer.
     *
     * - `state[WRITE_HEAD]` is where the next write will go
     * - `state[READ_HEAD]` is where the next read will come from
     * - `state[FLUSH_COUNT]` increments every time the buffer is flushed
     */
    private readonly state: Int32Array;

    /** Shared view of the monotonically increasing transport frame counter. */
    private readonly transport: BigInt64Array;

    constructor(sampleRate: number) {
        this.sampleRate = sampleRate;
        this.capacity = sampleRate * BUFFER_SECONDS;

        // allocate shared memory for audio data.
        // total size = channels * samples per channel * bytes per sample.
        this.channelData = new SharedArrayBuffer(
            CHANNEL_COUNT * this.capacity * Float32Array.BYTES_PER_ELEMENT,
        );

        // allocate shared memory for the state integers.
        this.stateBuffer = new SharedArrayBuffer(
            3 * Int32Array.BYTES_PER_ELEMENT,
        );

        this.transportBuffer = new SharedArrayBuffer(
            BigInt64Array.BYTES_PER_ELEMENT,
        );

        // create a Float32Array view for each channel, slicing into the
        // shared buffer at the correct offset so channels don't overlap.
        this.channels = Array.from({ length: CHANNEL_COUNT }, (_, i) => {
            return new Float32Array(
                this.channelData,
                i * this.capacity * Float32Array.BYTES_PER_ELEMENT,
                this.capacity,
            );
        });

        this.state = new Int32Array(this.stateBuffer);
        this.transport = new BigInt64Array(this.transportBuffer);
    }

    /**
     * How many samples per channel are currently available for the worklet
     * to read.
     *
     * This is the distance between the write head and read head, accounting for
     * wrap-around.
     */
    get availableSamples(): number {
        const write = Atomics.load(this.state, WRITE_HEAD);
        const read = Atomics.load(this.state, READ_HEAD);
        return (write - read + this.capacity) % this.capacity;
    }

    /**
     * How many more samples per channel we can write before the buffer is full.
     */
    get freeSpace(): number {
        /**
         * We subtract 1 to always keep one slot empty — this is how we
         * distinguish a completely full buffer from a completely empty one,
         * since both would otherwise have equal head positions.
         */
        return this.capacity - this.availableSamples - 1;
    }

    /**
     * Writes `frames` samples per channel from the provided deinterleaved
     * channel arrays into the ring buffer.
     *
     * If there isn't enough free space, the write is rejected entirely and
     * this method returns false. The caller should wait until the worklet has
     * consumed more samples before retrying.
     *
     * When a chunk wraps around the end of the buffer, it's written in two
     * parts: the first part fills up to the end, and the second part continues
     * from the beginning.
     */
    write(left: Float32Array, right: Float32Array, frames: number): boolean {
        if (frames > this.freeSpace) return false;
        const writeHead = Atomics.load(this.state, WRITE_HEAD);
        const sources = [left, right];

        for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
            const src = sources[ch];

            // writeHead might be near the end of the array, so the chunk might
            // not fit in one contiguous stretch — we may need to write the
            // tail end first, then wrap around and continue from the beginning.
            const spaceToEnd = this.capacity - writeHead;

            if (frames <= spaceToEnd) {
                // the chunk fits without wrapping — write it in one shot
                this.channels[ch].set(src.subarray(0, frames), writeHead);
            } else {
                // the chunk wraps around — write in two parts
                this.channels[ch].set(src.subarray(0, spaceToEnd), writeHead);
                this.channels[ch].set(src.subarray(spaceToEnd, frames), 0);
            }
        }

        // advance the write head, wrapping around if we've reached the end.
        // we only update it after all channels are written so the worklet
        // never reads a partially written chunk.
        Atomics.store(
            this.state,
            WRITE_HEAD,
            (writeHead + frames) % this.capacity,
        );

        return true;
    }

    /**
     * Discards all buffered audio by catching the read head up to the write
     * head. Useful for seeking — the worklet will immediately start reading
     * whatever the main thread writes next, with no leftover samples from
     * before the seek.
     *
     * The flush count is incremented so the audio thread can detect when a
     * flush occurred between its load and store of READ_HEAD. Without this,
     * the worklet could overwrite the flushed read head with a stale value,
     * causing it to replay audio from before the seek.
     */
    flush(): void {
        const write = Atomics.load(this.state, WRITE_HEAD);
        Atomics.store(this.state, READ_HEAD, write);
        Atomics.add(this.state, FLUSH_COUNT, 1);
    }

    get transportFrame(): bigint {
        return Atomics.load(this.transport, TRANSPORT_FRAME);
    }
}
