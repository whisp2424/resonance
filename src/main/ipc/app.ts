import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { is } from "@electron-toolkit/utils";
import { log } from "@shared/utils/logger";

export function registerAppHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle("app:log", (_, message, category, severity) => {
        log(message, category, severity);
    });

    ipc.handle("app:isDev", () => is.dev);
}
