import { RingBuffer } from "@renderer/lib/audio/engine/RingBuffer";

const READ_HEAD = 1;

export interface AudioEngineCallbacks {
    /**
     * Called when the audio worklet reports buffer starvation — the ring
     * buffer ran dry and the worklet is outputting silence.
     *
     * This is a diagnostic signal only. The worklet recovers automatically
     * once the write loop catches up. PlaybackManager is not involved.
     */
    onStarvation: () => void;
}

/**
 * Owns the AudioContext, RingBuffer, AudioWorkletNode, and GainNode.
 *
 * Knows nothing about tracks or queues — only samples. Position is derived
 * from the worklet's read head in shared memory. Seeking flushes the ring
 * buffer and repositions; restarting the stream is PlaybackManager's concern.
 *
 * Call `init()` before use and `destroy()` before reinitializing after a
 * device or sample rate change.
 */
export class AudioEngine {
    private readonly processorPath: string;
    private readonly callbacks: AudioEngineCallbacks;

    private context: AudioContext | null = null;
    private ringBuffer: RingBuffer | null = null;
    private workletNode: AudioWorkletNode | null = null;
    private gainNode: GainNode | null = null;

    /**
     * The read-side view into the ring buffer's state, shared with the
     * audio worklet. Used to derive the current playback position without
     * any message passing.
     */
    private stateView: Int32Array | null = null;

    /**
     * The position in seconds at the start of the current write session.
     * Set to 0 on init, updated on seek.
     */
    private trackStartPosition = 0;

    /**
     * Monotonically increasing count of samples consumed by the worklet since
     * the last seek or init.
     *
     * READ_HEAD is a circular index that wraps at buffer capacity (~20s), so
     * reading it directly would reset the position on every wrap. Instead we
     * accumulate the delta on each position read, which gives a true elapsed
     * sample count regardless of how many times the buffer has wrapped.
     */
    private samplesConsumed = 0;

    /**
     * The READ_HEAD value observed on the previous position read. Used to
     * compute the delta and detect wrap-around.
     */
    private lastReadHead = 0;

    constructor(processorPath: string, callbacks: AudioEngineCallbacks) {
        this.processorPath = processorPath;
        this.callbacks = callbacks;
    }

    get isInitialized(): boolean {
        return this.context !== null && this.ringBuffer !== null;
    }

    get sampleRate(): number {
        return this.context?.sampleRate ?? 0;
    }

    getRingBuffer(): RingBuffer {
        if (!this.ringBuffer) throw new Error("AudioEngine is not initialized");
        return this.ringBuffer;
    }

    /**
     * Creates the AudioContext, allocates the RingBuffer, loads the worklet
     * processor, and wires up the effects chain.
     *
     * Must be called before any other method. Safe to call again after
     * `destroy()` to reinitialize following a device or config change.
     */
    async init(): Promise<void> {
        this.context = new AudioContext();
        this.ringBuffer = new RingBuffer(this.context.sampleRate);
        this.stateView = new Int32Array(this.ringBuffer.stateBuffer);
        this.trackStartPosition = 0;
        this.samplesConsumed = 0;
        this.lastReadHead = 0;

        await this.context.audioWorklet.addModule(this.processorPath);

        this.workletNode = new AudioWorkletNode(
            this.context,
            "AudioProcessor",
            { numberOfOutputs: 1, outputChannelCount: [2] },
        );

        // send the shared memory references to the worklet so it can read
        // directly from the same ring buffer the main thread writes into
        this.workletNode.port.postMessage({
            channelData: this.ringBuffer.channelData,
            stateBuffer: this.ringBuffer.stateBuffer,
            capacity: this.ringBuffer.capacity,
        });

        this.workletNode.port.onmessage = (e: MessageEvent) => {
            if (e.data?.type === "starvation") this.callbacks.onStarvation();
        };

        // wire the effects chain: worklet → gain → destination
        this.gainNode = this.context.createGain();
        this.workletNode.connect(this.gainNode);
        this.gainNode.connect(this.context.destination);

        // AudioContext starts in the running state on some browsers and
        // suspended on others — suspend explicitly so playback only begins
        // when play() is called
        await this.context.suspend();
    }

    /**
     * Suspends and closes the AudioContext and releases all audio resources.
     *
     * Must be called before reinitializing following a device or sample rate
     * change. After `destroy()`, call `init()` to bring the engine back up.
     *
     * The current position in seconds should be captured via `position` before
     * calling `destroy()` so PlaybackManager can restart the stream at the
     * correct offset.
     */
    async destroy(): Promise<void> {
        this.workletNode?.disconnect();
        this.gainNode?.disconnect();

        if (this.context) await this.context.close();

        this.context = null;
        this.ringBuffer = null;
        this.workletNode = null;
        this.gainNode = null;
        this.stateView = null;
        this.trackStartPosition = 0;
        this.samplesConsumed = 0;
        this.lastReadHead = 0;
    }

    /**
     * Resumes the AudioContext, allowing the worklet to produce output.
     */
    async play(): Promise<void> {
        await this.context?.resume();
    }

    /**
     * Suspends the AudioContext, stopping output without discarding buffered
     * samples.
     */
    async pause(): Promise<void> {
        await this.context?.suspend();
    }

    /**
     * Flushes the ring buffer and repositions the playback position to the
     * given offset in seconds.
     *
     * This only handles the audio engine side of a seek. PlaybackManager is
     * responsible for aborting the current AudioStream and starting a new one
     * at the given offset.
     */
    seek(position: number): void {
        this.ringBuffer?.flush();
        this.trackStartPosition = position;
        this.samplesConsumed = 0;
        this.lastReadHead = 0;
    }

    /**
     * The current playback position in seconds.
     *
     * Accumulates the delta between successive READ_HEAD observations to
     * produce a monotonically increasing value that survives buffer wrap-around.
     *
     * Must be polled frequently enough to not miss a full wrap (~20s at 44100Hz).
     *
     * Returns 0 if the engine has not been initialized.
     */
    get position(): number {
        if (!this.stateView || !this.ringBuffer) return 0;
        const readHead = Atomics.load(this.stateView, READ_HEAD);

        const delta =
            (readHead - this.lastReadHead + this.ringBuffer.capacity) %
            this.ringBuffer.capacity;

        this.lastReadHead = readHead;
        this.samplesConsumed += delta;

        return (
            this.trackStartPosition +
            this.samplesConsumed / this.ringBuffer.sampleRate
        );
    }

    /**
     * The current volume as a linear gain value (0.0–1.0).
     *
     * Returns 0 if the engine has not been initialized.
     */
    get volume(): number {
        return this.gainNode?.gain.value ?? 0;
    }

    set volume(value: number) {
        if (this.gainNode) this.gainNode.gain.value = value;
    }
}
