import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { log } from "@shared/utils/logger";

export const registerAppHandlers = () => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    ipc.handle("app:log", (_, message, category, severity) => {
        log(message, category, severity);
    });
};
