import { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import { getErrorMessage, log } from "@shared/utils/logger";
import { create } from "zustand";

interface PlaybackState {
    outputDevices: MediaDeviceInfo[];
    isLoading: boolean;
    error: string | null;
}

export type PlaybackStore = PlaybackState;

const loadDevices = async (
    set: (state: Partial<PlaybackState>) => void,
): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
        const devices = await AudioEngine.enumerateOutputDevices();
        set({
            outputDevices: devices,
            isLoading: false,
        });
    } catch (err) {
        const errorMessage = getErrorMessage(err);
        set({
            error: errorMessage,
            isLoading: false,
        });
        log(errorMessage, "playbackStore", "error");
    }
};

export const usePlaybackStore = create<PlaybackStore>((set) => {
    loadDevices(set);

    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener("devicechange", () =>
            loadDevices(set),
        );
    }

    return {
        outputDevices: [],
        isLoading: true,
        error: null,
    };
});
