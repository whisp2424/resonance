import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import { BrowserWindow, app, shell } from "electron";

import { registerWindowEvents } from "./events/window";
import { registerWindowHandlers } from "./ipc/window";

const createWindow = (): BrowserWindow => {
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        minWidth: 600,
        minHeight: 500,
        show: false,
        titleBarStyle: "hidden",
        titleBarOverlay: false,
        backgroundColor: "black",
        webPreferences: {
            preload: join(__dirname, "../preload/index.js"),
        },
    });

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    return mainWindow;
};

app.whenReady().then(() => {
    app.setAppUserModelId("moe.whisp.resonance");
    const mainWindow = createWindow();
    registerWindowEvents(mainWindow);
    registerWindowHandlers(mainWindow);
});

app.on("window-all-closed", () => {
    app.quit();
});
