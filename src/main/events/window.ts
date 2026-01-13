import type { BrowserWindow } from "electron";

export const registerWindowEvents = (mainWindow: BrowserWindow) => {
    mainWindow.on("enter-full-screen", () => {
        mainWindow.webContents.send("enter-full-screen");
    });

    mainWindow.on("leave-full-screen", () => {
        mainWindow.webContents.send("leave-full-screen");
    });

    mainWindow.on("maximize", () => {
        mainWindow.webContents.send("maximize");
    });

    mainWindow.on("unmaximize", () => {
        mainWindow.webContents.send("unmaximize");
    });
};
