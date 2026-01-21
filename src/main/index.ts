import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import trayIconDark from "@main/../../build/tray-dark.png?asset";
import trayIconLight from "@main/../../build/tray-light.png?asset";
import { registerSettingsHandlers } from "@main/ipc/settings";
import { registerSystemHandlers } from "@main/ipc/system";
import { registerWindowHandlers } from "@main/ipc/window";
import { settingsStore } from "@main/settings";
import { windowManager } from "@main/window/windowManager";
import { BASE_OPTIONS } from "@main/window/windowPolicies";
import { getWindowState } from "@main/window/windowState";
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
    const trayIcon = settingsStore.get("trayIcon");
    switch (trayIcon) {
        case "white":
            return trayIconDark;
        case "dark":
            return trayIconLight;
        case "auto":
            return nativeTheme.shouldUseDarkColorsForSystemIntegratedUI
                ? trayIconDark
                : trayIconLight;
        default:
            return trayIconLight;
    }
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
        if (!tray) return;
        tray.setImage(getTrayIcon());
    });

    settingsStore.onDidChange("trayIcon", () => {
        if (!tray) return;
        tray.setImage(getTrayIcon());
    });
};

const createMainWindow = (): BrowserWindow => {
    const options = { ...BASE_OPTIONS };
    const savedState = getWindowState("main");

    if (savedState) {
        if (savedState.x !== undefined && savedState.y !== undefined) {
            options.x = savedState.x;
            options.y = savedState.y;
        }

        if (savedState.width !== undefined && savedState.height !== undefined) {
            options.width = savedState.width;
            options.height = savedState.height;
        }

        if (savedState?.isFullscreen)
            options.fullscreen = savedState.isFullscreen;
    }

    const mainWindow = new BrowserWindow(options);

    mainWindow.on("ready-to-show", () => {
        if (savedState?.isMaximized) mainWindow.maximize();
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
    registerSettingsHandlers();
    const cleanupSystemHandlers = registerSystemHandlers(systemPreferences);

    settingsStore.onDidChange("theme", (theme) => {
        if (theme) nativeTheme.themeSource = theme;
    });

    app.on("window-all-closed", () => {
        cleanupSystemHandlers();
        app.quit();
    });
});
