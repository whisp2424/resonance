import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import { registerSystemHandlers } from "@main/handlers/system/ipc";
import { registerWindowEvents } from "@main/handlers/window/events";
import { registerWindowHandlers } from "@main/handlers/window/ipc";
import { BASE_WINDOW } from "@main/windowPolicies";
import {
    BrowserWindow,
    Menu,
    Tray,
    app,
    nativeImage,
    shell,
    systemPreferences,
} from "electron";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const createWindow = (): BrowserWindow => {
    const mainWindow = new BrowserWindow(BASE_WINDOW());

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
        }
    });

    mainWindow.webContents.on("will-navigate", (e) => e.preventDefault());
    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
    return mainWindow;
};

const createTray = (): void => {
    const icon = nativeImage.createFromDataURL(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAABxpRE9UAAAAAgAAAAAAAAAAAAAAgAAAAAAAAAAAAAAAq8gWIQAAADFJREFUOBFjZKAQMFKon2GgDGD8//8/w38GKgImujhQAxuGNgQwDMNmI8h2MJiUYDmVh2GQJRBQ08Y8L2/7/H0a3QAAAABJRU5ErkJggg==",
    );

    tray = new Tray(icon);
    const contextMenu = Menu.buildFromTemplate([
        {
            label: "Quit Resonance",
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip("Resonance");
    tray.setContextMenu(contextMenu);

    tray.on("click", () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else mainWindow.show();
        }
    });
};

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();

app.on("second-instance", () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

app.whenReady().then(() => {
    app.setAppUserModelId("moe.whisp.resonance");
    mainWindow = createWindow();
    createTray();

    registerWindowEvents(mainWindow);
    registerWindowHandlers(mainWindow);
    registerSystemHandlers(mainWindow, systemPreferences);
});

app.on("window-all-closed", () => {
    app.quit();
});
