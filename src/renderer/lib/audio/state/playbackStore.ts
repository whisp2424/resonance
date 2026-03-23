import { create } from "zustand";

interface PlaybackState {
    isPlaying: boolean;

    /** Position in seconds, polled from AudioEngine at ~60fps. */
    position: number;

    /** Current volume level, represented by a number from 0 to 1. */
    volume: number;
}

interface PlaybackActions {
    setIsPlaying: (value: boolean) => void;
    setPosition: (value: number) => void;
    setVolume: (value: number) => void;
}

export type PlaybackStore = PlaybackState & PlaybackActions;

const DEFAULT_STATE: PlaybackState = {
    isPlaying: false,
    position: 0,
    volume: 1,
};

export const usePlaybackStore = create<PlaybackStore>((set) => ({
    ...DEFAULT_STATE,

    setIsPlaying: (value) => set({ isPlaying: value }),
    setPosition: (value) => set({ position: value }),
    setVolume: (value) => set({ volume: value }),
}));

export const selectIsMuted = (state: PlaybackStore) => state.volume === 0;
