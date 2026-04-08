import type {
    PlaybackSessionEvent,
    PlaybackSessionSnapshot,
} from "@renderer/lib/audio/PlaybackSession";

import { PlaybackSession } from "@renderer/lib/audio/PlaybackSession";
import { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import AudioProcessor from "@renderer/lib/audio/processing/audioProcessor?worker&url";
import { useSettingsStore } from "@renderer/lib/settings/settingsStore";
import { getErrorMessage, log } from "@shared/utils/logger";

const POSITION_INTERVAL_MS = 100;

export interface PlaybackState {
    isPlaying: boolean;
    positionMs: number;
    volume: number;
    outputDevices: MediaDeviceInfo[];
}

/** Store access used by the runtime to mirror UI-facing playback state. */
interface PlaybackRuntimeOptions {
    getPlaybackState(): PlaybackState;
    setPlaybackState(state: Partial<PlaybackState>): void;
}

/** Optional track-loading behavior used by queue restore and normal playback. */
type LoadTrackOptions = {
    positionMs?: number;
    shouldPlay?: boolean;
};

/**
 * Internal playback runtime.
 *
 * Owns the audio engine, playback session, device routing, and reconnect
 * behavior. React components should consume playback state through
 * `playbackStore`, not by reading this class directly.
 */
export class PlaybackRuntime {
    /** Active audio engine used for transport and output routing. */
    private engine: AudioEngine | null = null;

    /** Current playback session that streams track data into the engine. */
    private session: PlaybackSession | null = null;

    /** Current track remembered for resume, reload, and queue transitions. */
    private currentTrack = { id: null as number | null, positionMs: 0 };

    /** Output-change bookkeeping for disconnect pause and in-flight rerouting. */
    private deviceState = {
        isChangingOutput: false,
        pausedByDisconnect: false,
    };

    /** RequestAnimationFrame and subscription handles owned by the runtime. */
    private timers = {
        frameId: null as number | null,
        lastPollAt: 0,
        unsubscribeSnapshot: null as (() => void) | null,
    };

    /** Callbacks to notify when the current track reaches the end. */
    private endedCallbacks = new Set<() => void>();

    /** Stable devicechange listener reference for add/removeEventListener. */
    private handleDeviceChange = (): void => {
        this.syncOutput();
    };

    constructor(private options: PlaybackRuntimeOptions) {
        if (typeof navigator !== "undefined" && navigator.mediaDevices) {
            navigator.mediaDevices.addEventListener(
                "devicechange",
                this.handleDeviceChange,
            );
        }
    }

    /** Subscribes queue logic to track-end notifications. */
    onTrackEnded(callback: () => void): () => void {
        this.endedCallbacks.add(callback);
        return () => {
            this.endedCallbacks.delete(callback);
        };
    }

    /** Remembers the current logical track and position for later resume. */
    setTrack(trackId: number, positionMs: number): void {
        this.currentTrack.id = trackId;
        this.currentTrack.positionMs = positionMs;
    }

    /**
     * Loads a track into the runtime and optionally starts playing from the
     * requested position.
     */
    async loadTrack(
        trackId: number,
        options?: LoadTrackOptions,
    ): Promise<void> {
        const { positionMs = 0, shouldPlay = true } = options ?? {};

        this.deviceState.pausedByDisconnect = false;
        this.currentTrack.id = trackId;
        this.currentTrack.positionMs = positionMs;

        if (!shouldPlay) {
            this.options.setPlaybackState({ isPlaying: false, positionMs });
            return;
        }

        await this.ensureReady();
        await this.syncOutput();
        if (!this.session) return;

        const success = await this.session.playTrack(
            trackId,
            positionMs / 1000,
        );

        if (!success) return;

        this.options.setPlaybackState({ isPlaying: true, positionMs });
        this.startPolling();
    }

    /** Starts or resumes playback for the remembered current track. */
    async play(): Promise<void> {
        this.deviceState.pausedByDisconnect = false;
        if (this.currentTrack.id === null) return;

        await this.ensureReady();
        await this.syncOutput();

        if (!this.session || !this.engine) return;
        if (this.session.currentTrackId === null) {
            const success = await this.session.playTrack(
                this.currentTrack.id,
                this.currentTrack.positionMs / 1000,
            );

            if (!success) return;
        } else {
            await this.engine.play();
        }

        this.options.setPlaybackState({
            isPlaying: true,
            positionMs: this.currentTrack.positionMs,
        });

        this.startPolling();
    }

    /** Pauses playback without discarding track context. */
    pause(): void {
        this.deviceState.pausedByDisconnect = false;
        this.engine?.pause();
        this.stopPolling();
        this.options.setPlaybackState({ isPlaying: false });
    }

    /** Seeks within the current track. */
    async seek(positionMs: number): Promise<void> {
        if (this.currentTrack.id === null) return;

        const shouldPlay = this.options.getPlaybackState().isPlaying;
        this.currentTrack.positionMs = positionMs;
        this.options.setPlaybackState({ positionMs });

        if (!this.session || !this.engine) return;
        await this.session.seek(positionMs / 1000, {
            shouldPlay,
        });

        if (!shouldPlay)
            this.options.setPlaybackState({ isPlaying: false, positionMs });
    }

    /** Stops playback and resets the remembered track position to zero. */
    async stop(): Promise<void> {
        this.deviceState.pausedByDisconnect = false;
        this.stopPolling();
        this.currentTrack.positionMs = 0;
        this.options.setPlaybackState({ isPlaying: false, positionMs: 0 });

        if (!this.session) return;
        await this.session.stop();
    }

    /** Applies a new playback volume to both store state and the engine. */
    setVolume(volume: number): void {
        if (this.engine) this.engine.volume = volume;
        this.options.setPlaybackState({ volume });
    }

    /**
     * Reconciles the active output route with current settings and available
     * devices.
     */
    async syncOutput(): Promise<void> {
        if (this.deviceState.isChangingOutput) return;
        this.deviceState.isChangingOutput = true;

        try {
            const settings = useSettingsStore.getState().settings?.audio.output;
            if (!settings) return;

            const previousOutputDevices =
                this.options.getPlaybackState().outputDevices;
            const outputDevices = await this.getOutputDevices();

            // compare the current output device against the refreshed device
            // list, so we can tell if it was disconnected
            const selectedDeviceChanged =
                settings.deviceId !== "default" &&
                previousOutputDevices.some(
                    (device) => device.deviceId === settings.deviceId,
                ) &&
                !outputDevices.some(
                    (device) => device.deviceId === settings.deviceId,
                );

            // if playback is active and the output device is no longer
            // available, fallback to the silent sink while we switch to the
            // new device
            if (
                selectedDeviceChanged &&
                this.options.getPlaybackState().isPlaying &&
                this.engine
            ) {
                const result = await this.engine.setOutputDevice("none");
                if (!result.success)
                    log(result.message, "PlaybackRuntime", "error");
            }

            const canUseSelectedDevice =
                settings.deviceId === "default" ||
                outputDevices.some(
                    (device) => device.deviceId === settings.deviceId,
                );

            // if playback had been paused by disconnection and the preferred
            // device is available again, restore the sink and resume
            if (
                this.deviceState.pausedByDisconnect &&
                settings.resumeOnReconnect &&
                settings.onDisconnectRouting === "keep_preferred" &&
                settings.deviceId !== "default" &&
                canUseSelectedDevice
            ) {
                await this.setOutput(outputDevices, settings.deviceId);
                this.deviceState.pausedByDisconnect = false;
                await this.play();
                return;
            }

            // `switch_to_default` updates the persisted setting so the saved
            // device matches the runtime sink after a disconnect
            if (
                selectedDeviceChanged &&
                settings.onDisconnectRouting === "switch_to_default" &&
                settings.deviceId !== "default"
            ) {
                await useSettingsStore
                    .getState()
                    .updateSetting("audio.output.deviceId", "default");
            }

            const nextDeviceId = canUseSelectedDevice
                ? settings.deviceId
                : settings.onDisconnectRouting === "switch_to_default"
                  ? "default"
                  : "none";

            if (!this.engine || !this.session) {
                await this.setOutput(outputDevices, nextDeviceId);
                return;
            }

            // if nothing disconnected, just apply the new sink and clear any
            // stale reconnect pause state that no longer applies
            if (!selectedDeviceChanged) {
                await this.setOutput(outputDevices, nextDeviceId);

                if (
                    !settings.resumeOnReconnect ||
                    settings.onDisconnectRouting !== "keep_preferred" ||
                    settings.deviceId === "default"
                ) {
                    this.deviceState.pausedByDisconnect = false;
                }

                return;
            }

            // the selected output disappeared, decide whether transport should
            // continue on the fallback sink or pause and wait for reconnect.

            const wasPlaying = this.options.getPlaybackState().isPlaying;
            const positionMs =
                this.session.snapshot.trackPositionMilliseconds ??
                this.currentTrack.positionMs;

            const shouldPause = settings.pauseOnDisconnect && wasPlaying;
            const shouldContinue = wasPlaying && !shouldPause;

            this.currentTrack.positionMs = positionMs;

            if (
                shouldPause &&
                settings.resumeOnReconnect &&
                settings.onDisconnectRouting === "keep_preferred" &&
                settings.deviceId !== "default"
            ) {
                this.deviceState.pausedByDisconnect = true;
            } else {
                this.deviceState.pausedByDisconnect = false;
            }

            // keep the store in the playing state while the runtime is rebuilt
            // for seamless fallback playback
            if (shouldContinue && this.engine) {
                const result = await this.engine.setOutputDevice("none");
                if (!result.success)
                    log(result.message, "PlaybackRuntime", "error");
                this.options.setPlaybackState({ isPlaying: true });
            }

            await this.rebuildSession(
                positionMs,
                shouldContinue,
                nextDeviceId,
                outputDevices,
            );

            if (!shouldContinue)
                this.options.setPlaybackState({ isPlaying: false, positionMs });
        } finally {
            this.deviceState.isChangingOutput = false;
        }
    }

    /** Tears down audio resources and unregisters runtime listeners. */
    async destroy(): Promise<void> {
        this.deviceState.pausedByDisconnect = false;

        if (typeof navigator !== "undefined" && navigator.mediaDevices) {
            navigator.mediaDevices.removeEventListener(
                "devicechange",
                this.handleDeviceChange,
            );
        }

        this.stopPolling();
        this.timers.unsubscribeSnapshot?.();
        this.timers.unsubscribeSnapshot = null;
        await this.session?.destroy();
        this.session = null;
        await this.engine?.destroy();
        this.engine = null;
    }

    /** Creates the session if the runtime has not been started yet. */
    private async ensureReady(): Promise<void> {
        if (this.engine && this.session) return;

        const port = await electron.invoke("server:getPort");
        this.engine = new AudioEngine(AudioProcessor);

        await this.engine.init();

        this.engine.volume = this.options.getPlaybackState().volume;
        this.session = new PlaybackSession(this.engine, port);

        this.timers.unsubscribeSnapshot = this.session.subscribe((snapshot) => {
            this.handleSnapshot(snapshot);
        });

        this.session.subscribeEvents((event) => {
            this.handleSessionEvent(event);
        });
    }

    /**
     * Enumerates output devices and persists labels for known disconnected
     * ones.
     */
    private async getOutputDevices(): Promise<MediaDeviceInfo[]> {
        try {
            const outputDevices = await AudioEngine.enumerateOutputDevices();
            this.options.setPlaybackState({ outputDevices: outputDevices });

            const settings = useSettingsStore.getState().settings?.audio.output;
            if (!settings) return outputDevices;

            // index currently connected named devices so we can refresh labels
            // for known outputs and append newly discovered ones.m
            const discovered = new Map(
                outputDevices
                    .filter(
                        (device) =>
                            device.deviceId !== "default" &&
                            device.label.trim().length > 0,
                    )
                    .map((device) => [
                        device.deviceId,
                        { id: device.deviceId, label: device.label },
                    ]),
            );

            // keep the existing known-device order while replacing entries whose
            // labels were refreshed by the latest device enumeration
            const knownDevices = settings.knownDevices.map((knownDevice) => {
                const nextDevice = discovered.get(knownDevice.id);
                if (!nextDevice) return knownDevice;

                discovered.delete(knownDevice.id);
                return nextDevice.label === knownDevice.label
                    ? knownDevice
                    : nextDevice;
            });

            // whatever is still left in the map represents a newly seen output,
            // so append it after the existing known devices
            const nextKnownDevices =
                discovered.size === 0
                    ? knownDevices
                    : [...knownDevices, ...discovered.values()];

            // persist only when the known-device snapshot actually changed.
            const didKnownDevicesChange =
                nextKnownDevices.length !== settings.knownDevices.length ||
                settings.knownDevices.some(
                    (device, index) =>
                        device.id !== nextKnownDevices[index]?.id ||
                        device.label !== nextKnownDevices[index]?.label,
                );

            if (didKnownDevicesChange) {
                await useSettingsStore
                    .getState()
                    .updateSetting(
                        "audio.output.knownDevices",
                        nextKnownDevices,
                    );
            }

            return outputDevices;
        } catch (err) {
            log(getErrorMessage(err), "PlaybackRuntime", "error");
            return [];
        }
    }

    /**
     * Routes the engine to the requested sink and falls back to the silent sink
     * if the chosen output cannot be used.
     */
    private async setOutput(
        outputDevices: MediaDeviceInfo[],
        deviceId: string,
    ): Promise<void> {
        if (!this.engine) return;

        const target =
            deviceId === "default" ||
            deviceId === "none" ||
            outputDevices.some((device) => device.deviceId === deviceId)
                ? deviceId
                : "none";

        if (target === "none" && deviceId !== "none") {
            log(
                `Output device with ID "${deviceId}" is unavailable`,
                "PlaybackRuntime",
                "error",
            );
        }

        const result = await this.engine.setOutputDevice(target);
        if (result.success) return;

        log(
            `Couldn't route audio to output device with ID "${deviceId}"`,
            "PlaybackRuntime",
            "error",
        );

        await this.engine.setOutputDevice("none");
    }

    /** Starts the remembered current track on the given session. */
    private async startCurrentTrack(
        session: PlaybackSession,
        positionMs: number,
    ): Promise<boolean> {
        if (this.currentTrack.id === null) return false;
        return session.playTrack(this.currentTrack.id, positionMs / 1000);
    }

    private async rebuildSession(
        positionMs: number,
        shouldPlay: boolean,
        deviceId: string,
        outputDevices: MediaDeviceInfo[],
    ): Promise<void> {
        this.stopPolling();
        this.timers.unsubscribeSnapshot?.();
        this.timers.unsubscribeSnapshot = null;

        await this.session?.destroy();
        this.session = null;

        await this.engine?.destroy();
        this.engine = null;

        await this.ensureReady();
        await this.setOutput(outputDevices, deviceId);

        if (!shouldPlay || this.currentTrack.id === null) return;
        if (!this.session) return;

        const success = await this.startCurrentTrack(this.session, positionMs);
        if (!success) {
            this.options.setPlaybackState({ isPlaying: false, positionMs });
            return;
        }

        this.options.setPlaybackState({ isPlaying: true, positionMs });
        this.startPolling();
    }

    /** Mirrors session snapshots into the UI-facing playback store. */
    private handleSnapshot(snapshot: PlaybackSessionSnapshot): void {
        const positionMs =
            snapshot.trackPositionMilliseconds ??
            this.options.getPlaybackState().positionMs;

        const isPlaying =
            snapshot.state === "playing" &&
            this.engine?.audioContext?.state === "running";

        this.currentTrack.positionMs = positionMs;

        if (this.deviceState.isChangingOutput && !isPlaying) {
            this.options.setPlaybackState({ positionMs });
            return;
        }

        this.options.setPlaybackState({ isPlaying, positionMs });
    }

    private handleSessionEvent(event: PlaybackSessionEvent): void {
        if (event.type === "ended") {
            this.deviceState.pausedByDisconnect = false;
            this.stopPolling();
            this.currentTrack.positionMs = 0;
            this.options.setPlaybackState({
                isPlaying: false,
                positionMs: 0,
            });

            for (const callback of this.endedCallbacks) callback();
            return;
        }

        if (event.type === "error") {
            if (!this.deviceState.isChangingOutput) {
                log(event.message, "PlaybackRuntime", "error");
                this.stopPolling();
                this.options.setPlaybackState({ isPlaying: false });
            }

            return;
        }

        if (this.deviceState.isChangingOutput) return;

        this.stopPolling();
        this.options.setPlaybackState({ isPlaying: false });
    }

    /** Polls playback position while transport is running. */
    private readonly tick = (timestamp: number): void => {
        if (!this.session) return;

        if (timestamp - this.timers.lastPollAt >= POSITION_INTERVAL_MS) {
            const positionMs = this.session.snapshot.trackPositionMilliseconds;
            if (positionMs !== null) {
                this.currentTrack.positionMs = positionMs;
                this.options.setPlaybackState({ positionMs });
            }

            this.timers.lastPollAt = timestamp;
        }

        this.timers.frameId = requestAnimationFrame(this.tick);
    };

    /** Starts the polling loop used to keep UI position state fresh. */
    private startPolling(): void {
        this.stopPolling();
        this.timers.lastPollAt = performance.now();
        this.timers.frameId = requestAnimationFrame(this.tick);
    }

    /** Stops the polling loop if it is currently running. */
    private stopPolling(): void {
        if (this.timers.frameId === null) return;
        cancelAnimationFrame(this.timers.frameId);
        this.timers.frameId = null;
    }
}
