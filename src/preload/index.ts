import { contextBridge, ipcRenderer } from "electron";

const listeners = new Map<string, Set<() => void>>();
const accentColorListeners = new Set<(color: string) => void>();
let accentColorListenerRegistered = false;

const registerDualEvent = (
    channels: readonly [string, string],
    callback: () => void,
    key: string,
) => {
    channels.forEach((channel) => ipcRenderer.on(channel, callback));
    const existing = listeners.get(key) || new Set();
    existing.add(callback);
    listeners.set(key, existing);
};

const removeDualEvent = (channels: readonly [string, string], key: string) => {
    const channelListeners = listeners.get(key);
    if (channelListeners) {
        channelListeners.forEach((callback) => {
            channels.forEach((channel) =>
                ipcRenderer.removeListener(channel, callback),
            );
        });

        listeners.delete(key);
    }
};

const registerAccentColorListener = () => {
    if (!accentColorListenerRegistered) {
        accentColorListenerRegistered = true;
        ipcRenderer.on("system:accentColorChanged", (_, color) => {
            accentColorListeners.forEach((cb) => cb(color));
        });
    }
};

contextBridge.exposeInMainWorld("electronAPI", {
    closeWindow: () => ipcRenderer.invoke("window:close"),
    unmaximizeWindow: () => ipcRenderer.invoke("window:unmaximize"),
    minimizeWindow: () => ipcRenderer.invoke("window:minimize"),
    maximizeWindow: () => ipcRenderer.invoke("window:maximize"),

    isWindowMaximized: () => ipcRenderer.invoke("window:isMaximized"),
    onWindowMaximize: (callback: () => void) => {
        registerDualEvent(["maximize", "unmaximize"], callback, "maximize");
    },

    isWindowFullscreen: () => ipcRenderer.invoke("window:isFullscreen"),
    onWindowFullscreen: (callback: () => void) => {
        registerDualEvent(
            ["enter-full-screen", "leave-full-screen"],
            callback,
            "fullscreen",
        );
    },

    getAccentColor: () => ipcRenderer.invoke("system:accentColor"),
    onAccentColorChange: (callback: (color: string) => void) => {
        accentColorListeners.add(callback);
        registerAccentColorListener();
    },

    removeListeners: (channel: string) => {
        if (channel === "fullscreen") {
            removeDualEvent(
                ["enter-full-screen", "leave-full-screen"],
                "fullscreen",
            );
        } else if (channel === "maximize") {
            removeDualEvent(["maximize", "unmaximize"], "maximize");
        } else if (channel === "accentColor") {
            accentColorListeners.clear();
            ipcRenderer.removeAllListeners("system:accentColorChanged");
            accentColorListenerRegistered = false;
        }
    },
});
