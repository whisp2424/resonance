import type {
    MainIpcHandleEvents,
    MainIpcListenEvents,
} from "@shared/types/ipc";

import { IpcEmitter, IpcListener } from "@electron-toolkit/typed-ipc/main";
import { WINDOW_POLICIES } from "@main/windowPolicies";
import { BrowserWindow, shell } from "electron";

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

    ipc.handle("window:new", (_, route) => {
        const windowPolicy = WINDOW_POLICIES[route];
        if (!windowPolicy) throw new Error(`Invalid route: ${route}`);

        const win = new BrowserWindow(windowPolicy());
        win.webContents.on("will-navigate", (e) => e.preventDefault());
        win.webContents.setWindowOpenHandler((details) => {
            shell.openExternal(details.url);
            return { action: "deny" };
        });

        return win.id;
    });
};
