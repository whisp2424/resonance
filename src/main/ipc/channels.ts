export const IPC_CHANNELS = {
    WINDOW: {
        CLOSE: "window:close",
        MAXIMIZE: "window:maximize",
        UNMAXIMIZE: "window:unmaximize",
        MINIMIZE: "window:minimize",
        IS_MAXIMIZED: "window:isMaximized",
        IS_FULLSCREEN: "window:isFullscreen",
        GET_WINDOW_TITLE: "window:getWindowTitle",
        ON_WINDOW_TITLE_CHANGED: "window:titleChanged",
    },

    SYSTEM: {
        ACCENT_COLOR: "system:accentColor",
        ACCENT_COLOR_CHANGED: "system:accentColorChanged",
    },
} as const;
