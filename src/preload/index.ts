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

contextBridge.exposeInMainWorld("electron", {
    invoke,
    send,
    getWindowId,
});
