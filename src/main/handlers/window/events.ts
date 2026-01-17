import type { MainIpcListenEvents } from "@main/types/ipc";
import type { BrowserWindow } from "electron";

import { IpcEmitter } from "@electron-toolkit/typed-ipc/main";

export const registerWindowEvents = (mainWindow: BrowserWindow) => {
    const emitter = new IpcEmitter<MainIpcListenEvents>();

    mainWindow.on("enter-full-screen", () => {
        emitter.send(mainWindow.webContents, "window:onEnterFullscreen");
    });

    mainWindow.on("leave-full-screen", () => {
        emitter.send(mainWindow.webContents, "window:onLeaveFullscreen");
    });

    mainWindow.on("maximize", () => {
        emitter.send(mainWindow.webContents, "window:onMaximize");
    });

    mainWindow.on("unmaximize", () => {
        emitter.send(mainWindow.webContents, "window:onUnmaximize");
    });
};
