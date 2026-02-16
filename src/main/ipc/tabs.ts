import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { tabsManager } from "@main/tabsManager";

export function registerTabHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle("tabs:get", () => {
        return tabsManager.get();
    });

    ipc.handle("tabs:set", async (_event, tabs, activeId) => {
        await tabsManager.save(tabs, activeId);
    });
}
