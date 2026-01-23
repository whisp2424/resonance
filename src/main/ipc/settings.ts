import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { settingsManager } from "@main/settings";

export const registerSettingsHandlers = () => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    ipc.handle("settings:get", () => {
        return settingsManager.get();
    });

    ipc.handle("settings:set", async (_event, partial) => {
        await settingsManager.update(partial);
    });

    return () => ipc.dispose();
};
