import type { BrowserWindow } from "electron";

import { IPC_CHANNELS } from "@main/handlers/channels";

export const registerWindowEvents = (mainWindow: BrowserWindow) => {
    const { WINDOW } = IPC_CHANNELS;

    mainWindow.on("enter-full-screen", () => {
        mainWindow.webContents.send(WINDOW.ON_ENTER_FULLSCREEN);
    });

    mainWindow.on("leave-full-screen", () => {
        mainWindow.webContents.send(WINDOW.ON_LEAVE_FULLSCREEN);
    });

    mainWindow.on("maximize", () => {
        mainWindow.webContents.send(WINDOW.ON_MAXIMIZE);
    });

    mainWindow.on("unmaximize", () => {
        mainWindow.webContents.send(WINDOW.ON_UNMAXIMIZE);
    });
};
