import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { libraryManager } from "@main/library/libraryManager";
import { windowManager } from "@main/window/windowManager";

export const registerLibraryHandlers = (
    ipc: IpcListener<MainIpcHandleEvents>,
) => {
    ipc.handle("library:addSource", async (_, uri, type, name) => {
        const result = await libraryManager.addSource(uri, type, name);
        if (result) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });

    ipc.handle("library:getSources", async (_, type) => {
        return libraryManager.getSources(type);
    });

    ipc.handle("library:removeSource", async (_, uri, type) => {
        await libraryManager.removeSource(uri, type);
        windowManager.emitEvent("library:onSourcesChanged");
    });
};
