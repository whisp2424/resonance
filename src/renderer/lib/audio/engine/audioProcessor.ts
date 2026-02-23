const CHANNEL_COUNT = 2;

const WRITE_HEAD = 0;
const READ_HEAD = 1;

interface ProcessorInitMessage {
    /**
     * The shared memory block holding the actual PCM samples.
     *
     * Passed to the worklet on initialization so both threads see the same
     * data.
     */
    channelData: SharedArrayBuffer;

    /**
     * A tiny shared memory block holding just two integers: the write head
     * and read head positions.
     *
     * Both threads use these to know where to write or read next, and how much
     * audio is currently buffered.
     */
    state: SharedArrayBuffer;

    /**
     * The maximum number of samples per channel this buffer can hold at once.
     *
     * Equivalent to `BUFFER_SECONDS` seconds of audio at the given sample rate.
     */
    capacity: number;
}

/**
 * The audio worklet processor. Runs entirely on the audio thread, isolated
 * from the main thread and its event loop.
 *
 * On every process() call — which happens every 128 samples, driven by the
 * hardware clock — it reads 128 samples per channel from the ring buffer and
 * writes them to the output. If the buffer is starving, it outputs silence
 * and notifies the main thread so it can write more data.
 *
 * It starts silent and doesn't produce any output until the main thread has
 * initialized it with the shared memory references via port.postMessage().
 */
class AudioProcessor extends AudioWorkletProcessor {
    /**
     * The read-side interface into the shared audio ring buffer.
     *
     * This is an instance of `RingBufferReader`, created once the main thread
     * provides the SharedArrayBuffer references via `port.postMessage()`.
     *
     * It is responsible for pulling PCM frames from shared memory on every
     * `process()` call and advancing the read head so the main thread knows how
     * much space has been freed.
     *
     * Until initialization completes, this remains `null` and the processor
     * outputs silence.
     */
    private reader: RingBufferReader | null = null;

    constructor() {
        super();

        // the main thread sends the SharedArrayBuffer references once, right
        // after the worklet is added to the AudioContext. Until that message
        // arrives, process() outputs silence.
        this.port.onmessage = (e: MessageEvent<ProcessorInitMessage>) => {
            const { channelData, state, capacity } = e.data;
            this.reader = new RingBufferReader(channelData, state, capacity);
        };
    }

    process(_, outputs: Float32Array[][]): boolean {
        const output = outputs[0];

        if (!this.reader) {
            for (let ch = 0; ch < CHANNEL_COUNT; ch++) output[ch].fill(0);
            return true;
        }

        const didRead = this.reader.read(output, 128);
        if (!didRead)
            // buffer starved — notify the main thread
            this.port.postMessage({ type: "starvation" });

        // returning true keeps the processor alive. returning false would
        // cause the AudioContext to garbage collect it.
        return true;
    }
}

registerProcessor("AudioProcessor", AudioProcessor);

/**
 * The read-side mirror of RingBuffer, designed to run on the audio thread
 * inside an AudioWorklet processor.
 *
 * It receives the same SharedArrayBuffers that RingBuffer owns, giving it
 * a direct view into the same memory — no copying, no message passing.
 *
 * Its only job is to read 128 samples per channel on every process() call
 * and advance the read head so the main thread knows how much space has
 * freed up.
 */
class RingBufferReader {
    /**
     * The maximum number of samples per channel this buffer can hold at once.
     *
     * Equivalent to `BUFFER_SECONDS` seconds of audio at the given sample rate.
     */
    readonly capacity: number;

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
     * `heads[WRITE_HEAD]` is where the next write will go.
     *
     * `heads[READ_HEAD]` is where the next read will come from.
     */
    private readonly heads: Int32Array;

    constructor(
        channelData: SharedArrayBuffer,
        state: SharedArrayBuffer,
        capacity: number,
    ) {
        this.capacity = capacity;

        // create a Float32Array view for each channel, slicing into the
        // shared buffer at the correct offset so channels don't overlap.
        this.channels = Array.from({ length: CHANNEL_COUNT }, (_, i) => {
            return new Float32Array(
                channelData,
                i * capacity * Float32Array.BYTES_PER_ELEMENT,
                capacity,
            );
        });

        this.heads = new Int32Array(state);
    }

    /**
     * How many samples per channel are currently available for the worklet
     * to read.
     *
     * This is the distance between the write head and read head, accounting for
     * wrap-around.
     */
    get availableSamples(): number {
        const write = Atomics.load(this.heads, WRITE_HEAD);
        const read = Atomics.load(this.heads, READ_HEAD);
        return (write - read + this.capacity) % this.capacity;
    }

    /**
     * Reads a given number of samples per channel in the provided `output`
     * arrays and advances the read head.
     *
     * If there isn't enough data, the output is filled with silence and this
     * method returns false — the worklet should treat this as a starvation
     * signal.
     *
     * Like the write path, a read may wrap around the end of the buffer and
     * continue from the beginning.
     */
    read(output: Float32Array[], samples: number): boolean {
        if (this.availableSamples < samples) {
            for (let ch = 0; ch < CHANNEL_COUNT; ch++) output[ch].fill(0);
            return false;
        }

        const readHead = Atomics.load(this.heads, READ_HEAD);

        for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
            const spaceToEnd = this.capacity - readHead;

            /** The output array we're filling with samples. */
            const dst = output[ch];

            if (samples <= spaceToEnd) {
                dst.set(
                    this.channels[ch].subarray(readHead, readHead + samples),
                );
            } else {
                // wrap-around read — the available samples span the end of the
                // array and continue from the beginning
                dst.set(this.channels[ch].subarray(readHead, this.capacity));
                dst.set(
                    this.channels[ch].subarray(0, samples - spaceToEnd),
                    spaceToEnd,
                );
            }
        }

        Atomics.store(
            this.heads,
            READ_HEAD,
            (readHead + samples) % this.capacity,
        );

        return true;
    }
}
