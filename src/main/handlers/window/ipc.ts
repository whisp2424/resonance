import type { BrowserWindow } from "electron";

import { IPC_CHANNELS } from "@/handlers/channels";

export const registerWindowHandlers = (mainWindow: BrowserWindow) => {
    const { WINDOW } = IPC_CHANNELS;

    mainWindow.webContents.ipc.handle(WINDOW.CLOSE, () => {
        mainWindow.close();
    });

    mainWindow.webContents.ipc.handle(WINDOW.MAXIMIZE, () => {
        mainWindow.maximize();
    });

    mainWindow.webContents.ipc.handle(WINDOW.UNMAXIMIZE, () => {
        mainWindow.unmaximize();
    });

    mainWindow.webContents.ipc.handle(WINDOW.MINIMIZE, () => {
        mainWindow.minimize();
    });

    mainWindow.webContents.ipc.handle(WINDOW.IS_MAXIMIZED, () => {
        return mainWindow.isMaximized();
    });

    mainWindow.webContents.ipc.handle(WINDOW.IS_FULLSCREEN, () => {
        return mainWindow.isFullScreen();
    });

    mainWindow.webContents.ipc.handle(WINDOW.GET_WINDOW_TITLE, () => {
        return mainWindow.title;
    });

    mainWindow.webContents.ipc.handle(
        WINDOW.SET_WINDOW_TITLE,
        (_, title: string) => {
            mainWindow.title = title;
            mainWindow.webContents.send(WINDOW.ON_WINDOW_TITLE_CHANGED);
        },
    );
};
