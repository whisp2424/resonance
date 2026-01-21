import type {
    MainIpcHandleEvents,
    MainIpcListenEvents,
} from "@shared/types/ipc";
import type { AppSettings } from "@shared/types/settings";

import { IpcEmitter, IpcListener } from "@electron-toolkit/typed-ipc/main";
import { getSettings, updateSettings } from "@main/settings";
import { windowManager } from "@main/window/windowManager";

const emitter = new IpcEmitter<MainIpcListenEvents>();

export const registerSettingsHandlers = () => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    ipc.handle("settings:get", () => {
        return getSettings();
    });

    ipc.handle("settings:update", (_, newSettings: Partial<AppSettings>) => {
        const updatedSettings = updateSettings(newSettings);
        const changedKeys = Object.keys(newSettings) as Array<
            keyof AppSettings
        >;

        for (const info of windowManager["windows"].values()) {
            emitter.send(info.window.webContents, "settings:onChanged", {
                settings: updatedSettings,
                changedKeys,
            });
        }

        return updatedSettings;
    });
};
