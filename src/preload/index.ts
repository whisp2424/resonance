import type { Settings, SettingsKey } from "@shared/schema/settings";
import type {
    MainIpcHandleEvents,
    MainIpcListenEvents,
} from "@shared/types/ipc";

import { contextBridge, ipcRenderer } from "electron";

const invoke = <K extends keyof MainIpcHandleEvents>(
    channel: K,
    ...args: Parameters<MainIpcHandleEvents[K]>
): Promise<ReturnType<MainIpcHandleEvents[K]>> => {
    return ipcRenderer.invoke(channel, ...args) as Promise<
        ReturnType<MainIpcHandleEvents[K]>
    >;
};

const send = <K extends keyof MainIpcListenEvents>(
    channel: K,
    listener: (...args: MainIpcListenEvents[K]) => void,
): (() => void) => {
    const wrappedListener = (
        _: Electron.IpcRendererEvent,
        ...args: MainIpcListenEvents[K]
    ) => listener(...args);
    ipcRenderer.on(channel, wrappedListener);
    return () => {
        ipcRenderer.removeListener(channel, wrappedListener);
    };
};

const getWindowId = (): Promise<string | null> => {
    return ipcRenderer.invoke("window:getId") as Promise<string | null>;
};

const settings = {
    get: (): Promise<Settings> => {
        return invoke("settings:get");
    },

    set: (settings: Partial<Settings>): Promise<void> => {
        return invoke("settings:set", settings);
    },

    onChanged: (
        listener: (settings: Settings, key?: SettingsKey) => void,
        key?: SettingsKey,
    ): (() => void) => {
        return send("settings:onChanged", (settings, changedKey) => {
            if (key === undefined || key === changedKey) {
                listener(settings, changedKey);
            }
        });
    },

    onError: (listener: (message: string) => void): (() => void) => {
        return send("settings:onError", listener);
    },
};

contextBridge.exposeInMainWorld("electron", {
    invoke,
    send,
    getWindowId,
    settings,
});
