import type { PlaybackState } from "@renderer/lib/audio/PlaybackRuntime";

import { PlaybackRuntime } from "@renderer/lib/audio/PlaybackRuntime";
import { useSettingsStore } from "@renderer/lib/settings/settingsStore";
import { create } from "zustand";

interface PlaybackActions {
    play(): Promise<void>;
    pause(): void;
    seek(positionMs: number): Promise<void>;
    stop(): Promise<void>;
    setVolume(volume: number): void;
}

type PlaybackStore = PlaybackState & PlaybackActions;

let runtime: PlaybackRuntime | null = null;

function createPlaybackRuntime(
    getPlaybackState: () => PlaybackState,
    setPlaybackState: (state: Partial<PlaybackState>) => void,
): PlaybackRuntime {
    return new PlaybackRuntime({
        getPlaybackState,
        setPlaybackState,
    });
}

export function getPlaybackRuntime(): PlaybackRuntime {
    if (!runtime) {
        runtime = createPlaybackRuntime(
            () => usePlaybackStore.getState(),
            (state) => {
                usePlaybackStore.setState(state);
            },
        );

        runtime.syncOutput();
    }

    return runtime;
}

export const usePlaybackStore = create<PlaybackStore>((set, get) => {
    runtime ??= createPlaybackRuntime(get, set);
    runtime.syncOutput();

    return {
        isPlaying: false,
        positionMs: 0,
        volume: 1,
        outputDevices: [],
        play: async () => await getPlaybackRuntime().play(),
        pause: () => getPlaybackRuntime().pause(),
        seek: async (positionMs) => await getPlaybackRuntime().seek(positionMs),
        stop: async () => await getPlaybackRuntime().stop(),
        setVolume: (volume) => getPlaybackRuntime().setVolume(volume),
    };
});

useSettingsStore.subscribe((state, previousState) => {
    const nextOutput = state.settings?.audio.output;
    const previousOutput = previousState.settings?.audio.output;

    const settingsLoaded =
        previousOutput === undefined && nextOutput !== undefined;

    if (settingsLoaded) {
        getPlaybackRuntime().syncOutput();
        return;
    }

    if (!nextOutput || !previousOutput) return;

    const settingsChanged =
        nextOutput.deviceId !== previousOutput.deviceId ||
        nextOutput.pauseOnDisconnect !== previousOutput.pauseOnDisconnect ||
        nextOutput.resumeOnReconnect !== previousOutput.resumeOnReconnect ||
        nextOutput.onDisconnectRouting !== previousOutput.onDisconnectRouting;

    if (!settingsChanged) return;
    getPlaybackRuntime().syncOutput();
});
