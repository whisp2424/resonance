import { RingBuffer } from "@renderer/lib/audio/processing/RingBuffer";

/**
 * Owns the AudioContext, RingBuffer, AudioWorkletNode, and GainNode.
 *
 * Knows nothing about tracks or queues — only PCM frames flowing through the
 * output path. It exposes a monotonic transport clock plus a seekable offset
 * within the current stream session; mapping that onto a logical track is the
 * caller's responsibility.
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
     * The transport clock shared with the audio worklet.
     *
     * The worklet increments this every time it successfully emits frames,
     * giving the main thread a stable playback clock that does not depend on
     * the circular read head.
     */
    private transportView: BigInt64Array | null = null;

    /**
     * The stream position, in seconds, that should be reported when playback
     * reaches `transportStartFrame`.
     *
     * On init this is 0. On seek it becomes the requested seek target, so the
     * engine can continue reporting position from the new stream location.
     */
    private streamPositionBaseSeconds = 0;

    /**
     * The total number of output frames that had been played when
     * `streamPositionBaseSeconds` was last updated.
     *
     * A frame is one instant of audio across all channels. In stereo, that
     * means one left sample plus one right sample together. We count frames,
     * not individual samples, because playback time advances one frame at a
     * time.
     *
     * On init this is 0. On seek it is set to the current transport frame, so
     * future playback progress can be measured relative to the new stream
     * position.
     */
    private transportStartFrame = 0;

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
        this.transportView = new BigInt64Array(this.ringBuffer.transportBuffer);
        this.streamPositionBaseSeconds = 0;
        this.transportStartFrame = 0;

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
            transportBuffer: this.ringBuffer.transportBuffer,
            capacity: this.ringBuffer.capacity,
        });

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
     * The current stream-session position in seconds should be captured via
     * `transportPosition` before calling `destroy()` so the caller can restart
     * the stream at the correct offset.
     */
    async destroy(): Promise<void> {
        this.workletNode?.disconnect();
        this.gainNode?.disconnect();

        if (this.context) await this.context.close();

        this.context = null;
        this.ringBuffer = null;
        this.workletNode = null;
        this.gainNode = null;
        this.transportView = null;
        this.streamPositionBaseSeconds = 0;
        this.transportStartFrame = 0;
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
     * Flushes the ring buffer and repositions the current stream session to the
     * given offset in seconds.
     *
     * This does not identify a track. It only resets the engine's transport
     * origin for the current stream session. The caller is still responsible
     * for aborting the current AudioStream and starting a new one at the given
     * offset.
     */
    seek(position: number): void {
        this.ringBuffer?.flush();
        this.streamPositionBaseSeconds = position;
        this.transportStartFrame = this.transportFrame;
    }

    /**
     * Monotonic count of output frames consumed by the worklet since init.
     */
    get transportFrame(): number {
        if (!this.transportView) return 0;
        return Number(Atomics.load(this.transportView, 0));
    }

    /**
     * The current stream-session position in seconds.
     *
     * This is derived from the monotonic transport clock plus the most recent
     * stream position passed to `seek()`. It is stable even if the ring buffer
     * wraps many times between reads.
     *
     * This is not a track-aware position. It only answers: "how far into the
     * currently active stream session has the engine played?"
     *
     * Returns 0 if the engine has not been initialized.
     */
    get transportPosition(): number {
        if (!this.ringBuffer) return 0;

        return (
            this.streamPositionBaseSeconds +
            (this.transportFrame - this.transportStartFrame) /
                this.ringBuffer.sampleRate
        );
    }

    /**
     * The number of output frames consumed since the current stream-session
     * origin.
     *
     * Unlike `transportPosition`, this returns the raw frame count without
     * converting to seconds or adding the stream offset.
     *
     * Returns 0 if the engine has not been initialized.
     */
    get consumedFrames(): number {
        return this.transportFrame - this.transportStartFrame;
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
