/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

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

declare global {
    const APP_NAME: string;
    const APP_VERSION: string;

    const electron: {
        invoke: ElectronInvoke;
        send: ElectronSend;
        getWindowId: () => Promise<string | null>;
        settings: {
            get: () => Promise<Settings>;
            set: (settings: Partial<Settings>) => Promise<void>;
            onChanged: (
                listener: (settings: Settings, key?: SettingsKey) => void,
                key?: SettingsKey,
            ) => () => void;
            onError: (listener: (message: string) => void) => () => void;
        };
    };
}
