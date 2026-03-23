import { create } from "zustand";

export const HIDE_DELAY_MS = 500;

interface TriggerOptions {
    delay?: number;
}

interface TitleBarState {
    isVisible: boolean;
    hideTimeoutId: ReturnType<typeof setTimeout> | null;
    lock: () => void;
    unlock: () => void;
    trigger: (options?: TriggerOptions) => void;
    resetHideTimeout: () => void;
}

export const useTitleBarStore = create<TitleBarState>((set, get) => ({
    isVisible: false,
    hideTimeoutId: null,

    lock: () => {
        get().resetHideTimeout();
        set({ isVisible: true });
    },

    unlock: () => {
        get().resetHideTimeout();
        set({ isVisible: false });
    },

    resetHideTimeout: () => {
        const { hideTimeoutId } = get();
        if (hideTimeoutId) {
            clearTimeout(hideTimeoutId);
            set({ hideTimeoutId: null });
        }
    },

    trigger: (options?: TriggerOptions) => {
        const delayMs = options?.delay ?? HIDE_DELAY_MS;
        get().resetHideTimeout();
        set({ isVisible: true });

        const hideTimeoutId = setTimeout(() => {
            set({ isVisible: false, hideTimeoutId: null });
        }, delayMs);

        set({ hideTimeoutId });
    },
}));
