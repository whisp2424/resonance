import type { Settings, SettingsKey } from "@shared/schema/settings";
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

type SettingsAPI = {
    get: () => Promise<Settings>;
    set: (settings: Partial<Settings>) => Promise<void>;
    onChanged: (
        listener: (settings: Settings, key?: SettingsKey) => void,
        key?: SettingsKey,
    ) => () => void;
    onError: (listener: (message: string) => void) => () => void;
};

export interface ElectronAPI {
    invoke: ElectronInvoke;
    send: ElectronSend;
    settings: SettingsAPI;
}

declare global {
    interface Window {
        electron: ElectronAPI;
    }
}
