const CHANNEL_COUNT = 2;

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
 * Monotonic count of output frames emitted by the worklet.
 *
 * A frame is one instant of audio across all channels. In stereo, that means
 * one left sample plus one right sample together. This counter advances only
 * after a successful read from the ring buffer, giving the main thread a
 * stable transport clock that does not wrap like READ_HEAD.
 */
const TRANSPORT_FRAME = 0;

interface ProcessorInitMessage {
    /**
     * The shared memory block holding the actual PCM samples.
     *
     * Passed to the worklet on initialization so both threads see the same
     * data.
     */
    channelData: SharedArrayBuffer;

    /**
     * A tiny shared memory block holding three integers: the write head,
     * the read head, and a flush counter.
     *
     * Both threads use these to coordinate reading and writing.
     */
    stateBuffer: SharedArrayBuffer;

    /**
     * Shared monotonic transport-frame counter.
     *
     * Incremented every time the worklet successfully outputs frames.
     */
    transportBuffer: SharedArrayBuffer;

    /**
     * The maximum number of samples per channel this buffer can hold at once.
     *
     * Equivalent to `BUFFER_SECONDS` seconds of audio at the given sample rate.
     */
    capacity: number;
}

type ReadStatus = "full" | "partial" | "empty" | "flushed";

/**
 * The audio worklet processor. Runs entirely on the audio thread, isolated
 * from the main thread and its event loop.
 *
 * On every process() call — which happens every 128 samples, driven by the
 * hardware clock — it reads 128 samples per channel from the ring buffer and
 * writes them to the output. If there is not enough audio for a full quantum,
 * it pads with silence and notifies the main thread once per contiguous
 * starvation episode.
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

    /** True while the processor is continuously outputting silence on underrun. */
    private isStarving = false;

    constructor() {
        super();

        // the main thread sends the SharedArrayBuffer references once, right
        // after the worklet is added to the AudioContext. Until that message
        // arrives, process() outputs silence.
        this.port.onmessage = (e: MessageEvent<ProcessorInitMessage>) => {
            const { channelData, stateBuffer, capacity } = e.data;
            const { transportBuffer } = e.data;
            this.reader = new RingBufferReader(
                channelData,
                stateBuffer,
                transportBuffer,
                capacity,
            );
        };
    }

    process(_, outputs: Float32Array[][]): boolean {
        const output = outputs[0];

        if (!this.reader) {
            for (let ch = 0; ch < CHANNEL_COUNT; ch++) output[ch].fill(0);
            return true;
        }

        const readStatus = this.reader.read(output, 128);

        if (readStatus === "empty" || readStatus === "partial") {
            if (!this.isStarving) {
                this.isStarving = true;
                this.port.postMessage({ type: "starvation" });
            }
        } else {
            this.isStarving = false;
        }

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
     * - `state[WRITE_HEAD]` is where the next write will go
     * - `state[READ_HEAD]` is where the next read will come from
     * - `state[FLUSH_COUNT]` increments every time the buffer is flushed
     */
    private readonly state: Int32Array;

    /** Monotonic count of frames successfully emitted by the worklet. */
    private readonly transport: BigInt64Array;

    constructor(
        channelData: SharedArrayBuffer,
        stateBuffer: SharedArrayBuffer,
        transportBuffer: SharedArrayBuffer,
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

        this.state = new Int32Array(stateBuffer);
        this.transport = new BigInt64Array(transportBuffer);
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
     * Reads a given number of samples per channel in the provided `output`
     * arrays and advances the read head.
     *
     * If there is some data but fewer than `samples` available, the available
     * frames are written first and the rest of the block is padded with
     * silence. If there is no data at all, the full block is silence.
     *
     * The return value distinguishes full reads, partial tail reads, empty
     * reads, and flush-race drops.
     *
     * Like the write path, a read may wrap around the end of the buffer and
     * continue from the beginning.
     *
     * If the main thread flushed the buffer between our load and store of
     * READ_HEAD, the flush count will have changed. In that case we discard
     * the read and output silence so the flushed position isn't overwritten
     * with a stale value.
     */
    read(output: Float32Array[], samples: number): ReadStatus {
        const availableSamples = this.availableSamples;

        if (availableSamples === 0) {
            for (let ch = 0; ch < CHANNEL_COUNT; ch++) output[ch].fill(0);
            return "empty";
        }

        const samplesToRead = Math.min(availableSamples, samples);
        const needsSilencePadding = samplesToRead < samples;

        if (needsSilencePadding) {
            for (let ch = 0; ch < CHANNEL_COUNT; ch++) output[ch].fill(0);
        }

        const countBefore = Atomics.load(this.state, FLUSH_COUNT);
        const readHead = Atomics.load(this.state, READ_HEAD);

        for (let ch = 0; ch < CHANNEL_COUNT; ch++) {
            const spaceToEnd = this.capacity - readHead;

            /** The output array we're filling with samples. */
            const dst = output[ch];

            if (samplesToRead <= spaceToEnd) {
                dst.set(
                    this.channels[ch].subarray(
                        readHead,
                        readHead + samplesToRead,
                    ),
                );
            } else {
                // wrap-around read — the available samples span the end of the
                // array and continue from the beginning
                dst.set(this.channels[ch].subarray(readHead, this.capacity));
                dst.set(
                    this.channels[ch].subarray(0, samplesToRead - spaceToEnd),
                    spaceToEnd,
                );
            }
        }

        // if a flush occurred while we were reading, the main thread has
        // already repositioned READ_HEAD. Drop this cycle's output as
        // silence rather than overwriting the flushed position.
        const countAfter = Atomics.load(this.state, FLUSH_COUNT);
        if (countAfter !== countBefore) {
            for (let ch = 0; ch < CHANNEL_COUNT; ch++) output[ch].fill(0);
            return "flushed";
        }

        Atomics.store(
            this.state,
            READ_HEAD,
            (readHead + samplesToRead) % this.capacity,
        );

        Atomics.add(this.transport, TRANSPORT_FRAME, BigInt(samplesToRead));
        return samplesToRead === samples ? "full" : "partial";
    }
}
