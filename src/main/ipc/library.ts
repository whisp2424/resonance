import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { library } from "@main/library";
import { windowManager } from "@main/window/windowManager";

export const registerLibraryHandlers = (
    ipc: IpcListener<MainIpcHandleEvents>,
) => {
    ipc.handle("library:addSource", async (_, uri, type, name) => {
        const result = await library.addSource(uri, type, name);
        if (result) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });

    ipc.handle("library:getSources", async (_, type) => {
        return library.getSources(type);
    });

    ipc.handle("library:removeSource", async (_, uri, type) => {
        await library.removeSource(uri, type);
        windowManager.emitEvent("library:onSourcesChanged");
    });
};
