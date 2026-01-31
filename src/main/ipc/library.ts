import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { library } from "@main/library";

export const registerLibraryHandlers = (
    ipc: IpcListener<MainIpcHandleEvents>,
) => {
    ipc.handle("library:addSource", async (_, uri, type, name) => {
        return library.addSource(uri, type, name);
    });
};
