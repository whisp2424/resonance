import type { PlaybackSessionEvent } from "@renderer/lib/audio/PlaybackSession";

import { PlaybackSession } from "@renderer/lib/audio/PlaybackSession";
import { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import AudioProcessor from "@renderer/lib/audio/processing/audioProcessor?worker&url";
import { getErrorMessage, log } from "@shared/utils/logger";
import { create } from "zustand";

const POLL_INTERVAL_MS = 100;

interface PlaybackState {
    isPlaying: boolean;
    positionMs: number;
    volume: number;
    outputDevices: MediaDeviceInfo[];
}

interface PlaybackActions {
    /** Initializes the audio engine and playback session. */
    init(): Promise<void>;

    /** Tears down the engine and session permanently. */
    destroy(): void;

    /**
     * Loads a track and begins playback, replacing any currently playing track.
     *
     * This method is used internally by the stores, consumers should interact
     * with the queue API instead.
     */
    load(trackId: number, positionMs?: number): Promise<void>;

    /** Resumes playback after a pause. */
    play(): Promise<void>;

    /** Pauses playback without discarding the current track. */
    pause(): void;

    /** Seeks to a position within the current track. */
    seek(positionMs: number): void;

    /** Stops playback and resets the current track. */
    stop(): void;

    /** Sets the output volume, as a number between 0 and 1. */
    setVolume(volume: number): void;

    /** Routes audio output to the specified device. */
    setOutputDevice(deviceId: string): Promise<void>;

    /** Returns the AudioContext for use with visualizer libraries. */
    getContext(): AudioContext | null;

    /** Subscribes to track-ended events, returns an unsubscribe function. */
    onTrackEnded(callback: () => void): () => void;
}

export type PlaybackStore = PlaybackState & PlaybackActions;

const loadDevices = async (
    set: (state: Partial<PlaybackState>) => void,
): Promise<void> => {
    try {
        const devices = await AudioEngine.enumerateOutputDevices();
        set({ outputDevices: devices });
    } catch (err) {
        const errorMessage = getErrorMessage(err);
        log(errorMessage, "playbackStore", "error");
    }
};

let engine: AudioEngine | null = null;
let session: PlaybackSession | null = null;
let pollInterval: number | null = null;
const endedCallbacks = new Set<() => void>();

// Last loaded track info — allows play() to resume after stop()
let lastTrackId: number | null = null;
let lastPositionMs = 0;

function initPolling(): void {
    stopPolling();
    pollInterval = setInterval(() => {
        if (!session) return;
        const snapshot = session.snapshot;
        if (snapshot.trackPositionMilliseconds !== null) {
            usePlaybackStore.setState({
                positionMs: snapshot.trackPositionMilliseconds,
            });
        }
    }, POLL_INTERVAL_MS);
}

function stopPolling(): void {
    if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
    }
}

async function initRuntime(): Promise<void> {
    if (engine && session) return;

    const port = await electron.invoke("server:getPort");
    engine = new AudioEngine(AudioProcessor);
    await engine.init();

    session = new PlaybackSession(engine, port);
    session.subscribeEvents((event: PlaybackSessionEvent) => {
        if (event.type === "ended") {
            for (const callback of endedCallbacks) callback();
        }
    });
}

export const usePlaybackStore = create<PlaybackStore>((set) => {
    loadDevices(set);

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener("devicechange", () =>
            loadDevices(set),
        );
    }

    return {
        isPlaying: false,
        positionMs: 0,
        volume: 1,
        outputDevices: [],
        init: async () => {
            await initRuntime();
        },
        destroy: () => {
            stopPolling();
            session?.destroy();
            session = null;
            engine?.destroy();
            engine = null;
            lastTrackId = null;
            lastPositionMs = 0;
            set({ isPlaying: false, positionMs: 0 });
        },
        load: async (trackId: number, positionMs?: number) => {
            await initRuntime();
            if (!session) return;

            const offsetSeconds = positionMs ? positionMs / 1000 : 0;
            const success = await session.playTrack(trackId, offsetSeconds);

            if (success) {
                lastTrackId = trackId;
                lastPositionMs = positionMs ?? 0;
                set({ isPlaying: true, positionMs: lastPositionMs });
                initPolling();
            }
        },
        play: async () => {
            if (!engine) return;

            // If the session was stopped, reload the last track
            if (lastTrackId !== null && session?.currentTrackId === null) {
                const offsetSeconds = lastPositionMs / 1000;
                const success = await session.playTrack(
                    lastTrackId,
                    offsetSeconds,
                );
                if (success) {
                    set({ isPlaying: true, positionMs: lastPositionMs });
                    initPolling();
                }
                return;
            }

            await engine.play();
            set({ isPlaying: true });
            initPolling();
        },
        pause: () => {
            engine?.pause();
            stopPolling();
            set({ isPlaying: false });
        },
        seek: (positionMs: number) => {
            if (!session || !engine) return;
            session.seek(positionMs / 1000);
            set({ positionMs });
        },
        stop: async () => {
            if (!session) return;
            stopPolling();
            await session.stop();
            set({ isPlaying: false, positionMs: 0 });
        },
        setVolume: (volume: number) => {
            if (engine) engine.volume = volume;
            set({ volume });
        },
        setOutputDevice: async (deviceId: string) => {
            const result = await engine?.setOutputDevice(deviceId);
            if (result && !result.success) {
                log(result.message, "playbackStore", "error");
            }
        },
        getContext: () => {
            return engine?.audioContext ?? null;
        },
        onTrackEnded: (callback: () => void) => {
            endedCallbacks.add(callback);
            return () => {
                endedCallbacks.delete(callback);
            };
        },
    };
});
