import type { MainIpcHandleEvents, MainIpcListenEvents } from "@main/types/ipc";
import type { BrowserWindow } from "electron";

import { IpcEmitter, IpcListener } from "@electron-toolkit/typed-ipc/main";

export const registerWindowHandlers = (mainWindow: BrowserWindow) => {
    const ipc = new IpcListener<MainIpcHandleEvents>();
    const emitter = new IpcEmitter<MainIpcListenEvents>();

    ipc.handle("window:close", () => {
        mainWindow.close();
    });

    ipc.handle("window:maximize", () => {
        mainWindow.maximize();
    });

    ipc.handle("window:unmaximize", () => {
        mainWindow.unmaximize();
    });

    ipc.handle("window:minimize", () => {
        mainWindow.minimize();
    });

    ipc.handle("window:isMaximized", () => {
        return mainWindow.isMaximized();
    });

    ipc.handle("window:isFullscreen", () => {
        return mainWindow.isFullScreen();
    });

    ipc.handle("window:getTitle", () => {
        return mainWindow.title;
    });

    ipc.handle("window:setTitle", (_, title: string) => {
        mainWindow.title = title;
        emitter.send(mainWindow.webContents, "window:onWindowTitleChanged");
    });
};
