export const IPC_CHANNELS = {
    WINDOW: {
        CLOSE: "window:close",

        MAXIMIZE: "window:maximize",
        IS_MAXIMIZED: "window:isMaximized",
        ON_MAXIMIZE: "window:maximize",

        UNMAXIMIZE: "window:unmaximize",
        ON_UNMAXIMIZE: "window:unmaximize",

        MINIMIZE: "window:minimize",

        IS_FULLSCREEN: "window:isFullscreen",
        ON_ENTER_FULLSCREEN: "window:onEnterFullscreen",
        ON_LEAVE_FULLSCREEN: "window:onLeaveFullscreen",

        GET_WINDOW_TITLE: "window:getWindowTitle",
        SET_WINDOW_TITLE: "window:setWindowTitle",
        ON_WINDOW_TITLE_CHANGED: "window:onWindowTitleChanged",
    },

    SYSTEM: {
        GET_ACCENT_COLOR: "system:accentColor",
        ON_ACCENT_COLOR_CHANGED: "system:accentColorChanged",
    },
} as const;
