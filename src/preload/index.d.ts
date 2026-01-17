import type { MainIpcHandleEvents, MainIpcListenEvents } from "@main/types/ipc";

type ElectronInvoke = <K extends keyof MainIpcHandleEvents>(
    channel: K,
    ...args: Parameters<MainIpcHandleEvents[K]>
) => Promise<ReturnType<MainIpcHandleEvents[K]>>;

type ElectronSend = <K extends keyof MainIpcListenEvents>(
    channel: K,
    listener: (...args: MainIpcListenEvents[K]) => void,
) => () => void;

interface ElectronAPI {
    invoke: ElectronInvoke;
    send: ElectronSend;
}

declare global {
    const electron: ElectronAPI;

    interface Window {
        electron: ElectronAPI;
    }
}

export {};
