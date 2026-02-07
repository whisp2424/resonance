import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { libraryManager } from "@main/library/libraryManager";
import { windowManager } from "@main/window/windowManager";

export function registerLibraryHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle("library:addSource", async (_, uri, type, name) => {
        const result = await libraryManager.addSource(uri, type, name);
        if (result.success) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });

    ipc.handle("library:getSources", async (_, type) => {
        const result = await libraryManager.getSources(type);
        if (result.success) return result.data;
        return [];
    });

    ipc.handle("library:removeSource", async (_, uri, type) => {
        const result = await libraryManager.removeSource(uri, type);
        if (result.success) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });
}
