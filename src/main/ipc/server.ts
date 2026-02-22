import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { getPort } from "@main/audioServer";

export function registerServerHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle("server:getPort", () => getPort());
}
