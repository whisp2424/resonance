import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { is } from "@electron-toolkit/utils";
import { log } from "@shared/utils/logger";

export const registerAppHandlers = () => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    ipc.handle("app:log", (_, message, category, severity) => {
        log(message, category, severity);
    });

    ipc.handle("app:isDev", () => is.dev);
};
