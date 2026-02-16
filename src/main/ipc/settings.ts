import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { settingsManager } from "@main/settingsManager";

export function registerSettingsHandlers(
    ipc: IpcListener<MainIpcHandleEvents>,
) {
    ipc.handle("settings:get", () => {
        return settingsManager.get();
    });

    ipc.handle("settings:set", async (_event, partial) => {
        await settingsManager.update(partial);
    });

    ipc.handle("settings:setPath", async (_event, path, value) => {
        await settingsManager.setPath(path, value);
    });
}
