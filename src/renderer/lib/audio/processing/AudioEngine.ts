import { RingBuffer } from "@renderer/lib/audio/processing/RingBuffer";

const READ_HEAD = 1;

/**
 * Owns the AudioContext, RingBuffer, AudioWorkletNode, and GainNode.
 *
 * Knows nothing about tracks or queues — only samples. Position is derived
 * from the worklet's read head in shared memory. Seeking flushes the ring
 * buffer and repositions; restarting the stream is the caller's concern.
 *
 * Call `init()` before use and `destroy()` before reinitializing after a
 * device or sample rate change.
 */
export class AudioEngine {
    private readonly processorPath: string;

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

    constructor(processorPath: string) {
        this.processorPath = processorPath;
    }

    get isInitialized(): boolean {
        return this.context !== null && this.ringBuffer !== null;
    }

    get sampleRate(): number {
        return this.context?.sampleRate ?? 0;
    }

    get buffer(): RingBuffer | null {
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

        this.workletNode.port.onmessage = (_e: MessageEvent) => {
            // starvation messages from the worklet are intentionally ignored —
            // the worklet outputs silence and recovers automatically once the
            // write loop catches up
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
     * calling `destroy()` so the caller can restart the stream at the correct
     * offset.
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
     * Returns all available audio output devices.
     */
    static async enumerateOutputDevices(): Promise<MediaDeviceInfo[]> {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter((d) => d.kind === "audiooutput");
    }

    /**
     * Routes audio output to the given device.
     * Passing an empty string will use the default output.
     *
     * Has no effect if the engine has not been initialized.
     */
    async setOutputDevice(deviceId: string): Promise<void> {
        if (!this.context) return;
        await (
            this.context as AudioContext & {
                setSinkId: (id: string) => Promise<void>;
            }
        ).setSinkId(deviceId === "default" ? "" : deviceId);
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
     * This only handles the audio engine side of a seek. The caller is
     * responsible for aborting the current AudioStream and starting a new one
     * at the given offset.
     */
    seek(position: number): void {
        this.ringBuffer?.flush();
        this.trackStartPosition = position;
        this.samplesConsumed = 0;
        this.lastReadHead = this.stateView
            ? Atomics.load(this.stateView, READ_HEAD)
            : 0;
    }

    /**
     * Reads the audio thread's current read head from shared memory and accumulates
     * the number of newly consumed samples into `samplesConsumed`.
     *
     * `samplesConsumed` is a monotonically increasing counter used by TrackTimeline
     * to resolve which track is playing. It must be called frequently enough that
     * the read head never completes a full lap between calls (~20s at 44.1kHz).
     */
    private syncConsumedSamples(): void {
        if (!this.stateView || !this.ringBuffer) return;

        const readHead = Atomics.load(this.stateView, READ_HEAD);

        // Modular delta handles wrap-around when the read head passes capacity.
        const samplesConsumedSinceLastPoll =
            (readHead - this.lastReadHead + this.ringBuffer.capacity) %
            this.ringBuffer.capacity;

        this.lastReadHead = readHead;
        this.samplesConsumed += samplesConsumedSinceLastPoll;
    }

    /**
     * The current playback position in seconds.
     *
     * Accumulates the delta between successive READ_HEAD observations to
     * produce a monotonically increasing value that survives buffer
     * wrap-around.
     *
     * Must be polled frequently enough to not miss a full wrap
     * (~20s at 44100Hz).
     *
     * Returns 0 if the engine has not been initialized.
     */
    get position(): number {
        this.syncConsumedSamples();
        if (!this.ringBuffer) return 0;

        return (
            this.trackStartPosition +
            this.samplesConsumed / this.ringBuffer.sampleRate
        );
    }

    /**
     * The total number of samples consumed by the worklet since the last seek
     * or init. Used by TrackTimeline to resolve which track is currently
     * playing.
     *
     * Unlike `position`, this returns the raw sample count without converting
     * to seconds or adding the track start offset.
     *
     * Must be called frequently enough to not miss a full buffer wrap
     * (~20s at 44100 Hz). In practice, `position` or this getter should be
     * polled on every animation frame.
     *
     * Returns 0 if the engine has not been initialized.
     */
    get consumedSamples(): number {
        this.syncConsumedSamples();
        return this.samplesConsumed;
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
