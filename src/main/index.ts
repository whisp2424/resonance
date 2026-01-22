import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import trayIconDark from "@main/../../build/tray-dark.png?asset";
import trayIconLight from "@main/../../build/tray-light.png?asset";
import { registerSystemHandlers } from "@main/ipc/system";
import { registerWindowHandlers } from "@main/ipc/window";
import { windowManager } from "@main/window/windowManager";
import { BASE_OPTIONS } from "@main/window/windowPolicies";
import {
    BrowserWindow,
    Menu,
    Tray,
    app,
    nativeTheme,
    shell,
    systemPreferences,
} from "electron";

import product from "@main/../../build/product.json" with { type: "json" };

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const getTrayIcon = () => {
    // https://github.com/electron/electron/issues/48736
    return nativeTheme.shouldUseDarkColorsForSystemIntegratedUI
        ? trayIconDark
        : trayIconLight;
};

const createTray = (): void => {
    if (tray) return;
    tray = new Tray(getTrayIcon());

    const contextMenu = Menu.buildFromTemplate([
        {
            label: `Quit ${product.name.short}`,
            click: () => {
                isQuitting = true;
                app.quit();
            },
        },
    ]);

    tray.setToolTip(product.name.short);
    tray.setContextMenu(contextMenu);
    tray.on("click", () => {
        if (mainWindow?.isVisible()) mainWindow?.focus();
        else windowManager.toggleWindows();
    });

    nativeTheme.on("updated", () => {
        tray?.setImage(getTrayIcon());
    });
};

const createMainWindow = (): BrowserWindow => {
    const mainWindow = new BrowserWindow(BASE_OPTIONS);

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
        createTray();
    });

    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            windowManager.toggleWindows();
        }
    });

    mainWindow.webContents.on("will-navigate", (event) =>
        event.preventDefault(),
    );

    mainWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url);
        return { action: "deny" };
    });

    if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
        mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
    } else mainWindow.loadFile(join(__dirname, "../renderer/index.html"));

    windowManager.addWindow("main", mainWindow, "/", {
        close: true,
        maximize: true,
        minimize: true,
    });

    return mainWindow;
};

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) app.quit();

app.on("second-instance", () => {
    if (mainWindow) {
        mainWindow.show();
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

app.whenReady().then(() => {
    app.setAppUserModelId(product.appId);
    mainWindow = createMainWindow();

    registerWindowHandlers();
    const cleanupSystemHandlers = registerSystemHandlers(systemPreferences);

    app.on("window-all-closed", () => {
        cleanupSystemHandlers();
        app.quit();
    });
});
