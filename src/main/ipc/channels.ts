export const IPC_CHANNELS = {
    WINDOW: {
        CLOSE: "window:close",
        MAXIMIZE: "window:maximize",
        UNMAXIMIZE: "window:unmaximize",
        MINIMIZE: "window:minimize",
        IS_MAXIMIZED: "window:isMaximized",
        IS_FULLSCREEN: "window:isFullscreen",
    },

    SYSTEM: {
        ACCENT_COLOR: "system:accentColor",
        ACCENT_COLOR_CHANGED: "system:accentColorChanged",
    },
} as const;
