import { AudioEngine } from "@renderer/lib/audio/engine/AudioEngine";
import { getErrorMessage, log } from "@shared/utils/logger";
import { create } from "zustand";

interface AudioState {
    outputDevices: MediaDeviceInfo[];
    isLoading: boolean;
    error: string | null;
}

export type AudioStore = AudioState;

const loadDevices = async (
    set: (state: Partial<AudioState>) => void,
): Promise<void> => {
    set({ isLoading: true, error: null });
    try {
        const devices = await AudioEngine.enumerateOutputDevices();
        set({ outputDevices: devices, isLoading: false });
    } catch (err) {
        const errorMessage = getErrorMessage(err);
        set({ error: errorMessage, isLoading: false });
        log(errorMessage, "audioStore", "error");
    }
};

export const useAudioStore = create<AudioStore>((set) => {
    loadDevices(set);
    navigator.mediaDevices.addEventListener("devicechange", () =>
        loadDevices(set),
    );

    return {
        outputDevices: [],
        isLoading: true,
        error: null,
    };
});
