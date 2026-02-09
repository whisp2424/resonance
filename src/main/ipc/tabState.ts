import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { TabState } from "@shared/schema/tabState";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { tabStateManager } from "@main/tabState";

export function registerTabStateHandlers(
    ipc: IpcListener<MainIpcHandleEvents>,
) {
    ipc.handle("tabState:get", (): TabState | null => {
        return tabStateManager.get();
    });

    ipc.handle("tabState:save", async (_, state) => {
        await tabStateManager.save(state);
    });
}
