import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { libraryManager } from "@main/library/libraryManager";
import { windowManager } from "@main/window/windowManager";

export function registerLibraryHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle("library:addSource", async (_, uri, backend, name) => {
        const result = await libraryManager.addSource(uri, backend, name);
        if (result.success) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });

    ipc.handle("library:getSources", async (_, backend) => {
        const result = await libraryManager.getSources(backend);
        if (result.success) return result.data;
        return [];
    });

    ipc.handle("library:removeSource", async (_, uri, backend) => {
        const result = await libraryManager.removeSource(uri, backend);
        if (result.success) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });
}
