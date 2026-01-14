import { contextBridge, ipcRenderer } from "electron";

import { IPC_CHANNELS } from "@/handlers/channels";

const { WINDOW, SYSTEM } = IPC_CHANNELS;

contextBridge.exposeInMainWorld("electron", {
    window: {
        close: () => ipcRenderer.invoke(WINDOW.CLOSE),
        maximize: () => ipcRenderer.invoke(WINDOW.MAXIMIZE),
        isMaximized: () => ipcRenderer.invoke(WINDOW.IS_MAXIMIZED),
        onMaximized: (callback: () => void) => {
            const listener = () => callback();
            ipcRenderer.on(WINDOW.ON_MAXIMIZE, listener);
            ipcRenderer.on(WINDOW.ON_UNMAXIMIZE, listener);
            return () => {
                ipcRenderer.removeListener(WINDOW.ON_MAXIMIZE, listener);
                ipcRenderer.removeListener(WINDOW.ON_UNMAXIMIZE, listener);
            };
        },

        unmaximize: () => ipcRenderer.invoke(WINDOW.UNMAXIMIZE),
        minimize: () => ipcRenderer.invoke(WINDOW.MINIMIZE),

        isFullscreen: () => ipcRenderer.invoke(WINDOW.IS_FULLSCREEN),
        onFullscreenChange: (callback: (isFullscreen: boolean) => void) => {
            const enterListener = () => callback(true);
            const leaveListener = () => callback(false);

            ipcRenderer.on(WINDOW.ON_ENTER_FULLSCREEN, enterListener);
            ipcRenderer.on(WINDOW.ON_LEAVE_FULLSCREEN, leaveListener);

            return () => {
                ipcRenderer.removeListener(
                    WINDOW.ON_ENTER_FULLSCREEN,
                    enterListener,
                );
                ipcRenderer.removeListener(
                    WINDOW.ON_LEAVE_FULLSCREEN,
                    leaveListener,
                );
            };
        },

        getTitle: () => ipcRenderer.invoke(WINDOW.GET_WINDOW_TITLE),
        setTitle: (title: string) =>
            ipcRenderer.invoke(WINDOW.SET_WINDOW_TITLE, title),
        onTitleChanged: (callback: () => void) => {
            const listener = () => callback();
            const channel = WINDOW.ON_WINDOW_TITLE_CHANGED;
            ipcRenderer.on(channel, listener);
            return () => ipcRenderer.removeListener(channel, listener);
        },
    },

    system: {
        getAccentColor: () => ipcRenderer.invoke(SYSTEM.GET_ACCENT_COLOR),
        onAccentColorChanged: (callback: (color: string) => void) => {
            const listener = (_: Electron.IpcRendererEvent, color: string) =>
                callback(color);
            const channel = SYSTEM.ON_ACCENT_COLOR_CHANGED;
            ipcRenderer.on(channel, listener);
            return () => ipcRenderer.removeListener(channel, listener);
        },
    },
});
