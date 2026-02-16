import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { library } from "@main/library";
import { scanner } from "@main/library/mediaScanner";
import { windowManager } from "@main/window/windowManager";

export function registerLibraryHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle("library:addSource", async (_, path, name) => {
        const result = await library.addSource(path, name);
        if (result.success) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });

    ipc.handle("library:getSources", async () => {
        const result = await library.getSources();
        if (result.success) return result.data;
        return [];
    });

    ipc.handle("library:removeSource", async (_, sourceId) => {
        const result = await library.removeSource(sourceId);
        if (result.success) windowManager.emitEvent("library:onSourcesChanged");
        return result;
    });

    ipc.handle("library:scanSource", async (_, sourceId) => {
        const result = await scanner.scan(sourceId);
        return result;
    });
}
