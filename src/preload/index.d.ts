import type {
    MainIpcHandleEvents,
    MainIpcListenEvents,
} from "@shared/types/ipc";

type ElectronInvoke = <K extends keyof MainIpcHandleEvents>(
    channel: K,
    ...args: Parameters<MainIpcHandleEvents[K]>
) => Promise<ReturnType<MainIpcHandleEvents[K]>>;

type ElectronSend = <K extends keyof MainIpcListenEvents>(
    channel: K,
    listener: (...args: MainIpcListenEvents[K]) => void,
) => () => void;

export interface ElectronAPI {
    invoke: ElectronInvoke;
    send: ElectronSend;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
