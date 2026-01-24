import type { Settings } from "@shared/schema/settings";

import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import trayIconDark from "@main/../../build/tray-dark.png?asset";
import trayIconWhite from "@main/../../build/tray-white.png?asset";
import { registerSettingsHandlers } from "@main/ipc/settings";
import { registerSystemHandlers } from "@main/ipc/system";
import { registerWindowHandlers } from "@main/ipc/window";
import { initializeSettings, settingsManager } from "@main/settings";
import { windowManager } from "@main/window/windowManager";
import { BASE_OPTIONS } from "@main/window/windowPolicies";
import { windowStateManager } from "@main/windowState";
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

const getTrayIcon = (icon?: Settings["appearance"]["trayIcon"]) => {
    switch (icon) {
        case "white":
            return trayIconWhite;
        case "dark":
            return trayIconDark;
        default:
            // https://github.com/electron/electron/issues/48736
            return nativeTheme.shouldUseDarkColorsForSystemIntegratedUI
                ? trayIconWhite
                : trayIconDark;
    }
};

const createTray = (trayIcon?: Settings["appearance"]["trayIcon"]): void => {
    if (tray) return;

    tray = new Tray(getTrayIcon(trayIcon));
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
        tray?.setImage(getTrayIcon(trayIcon));
    });
};

const createMainWindow = (): BrowserWindow => {
    const mainWindow = new BrowserWindow({
        ...BASE_OPTIONS,
        width: 1200,
        height: 700,
    });

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
        windowManager.applyWindowState("main", mainWindow);
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
    if (!mainWindow) return;
    mainWindow.show();
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
});

app.whenReady().then(async () => {
    await initializeSettings();
    await windowStateManager.load();
    app.setAppUserModelId(product.appId);
    const settings = settingsManager.get();
    nativeTheme.themeSource = settings.appearance.appTheme;
    mainWindow = createMainWindow();

    const unsubscribeAppearanceSettings = settingsManager.onChanged(
        (settings) => {
            nativeTheme.themeSource = settings.appearance.appTheme;
            tray?.setImage(getTrayIcon(settings.appearance.trayIcon));
        },
        "appearance",
    );

    registerWindowHandlers();
    const cleanupSettingsHandlers = registerSettingsHandlers();
    const cleanupSystemHandlers = registerSystemHandlers(systemPreferences);

    app.on("will-quit", async () => {
        unsubscribeAppearanceSettings();
        cleanupSettingsHandlers();
        cleanupSystemHandlers();
    });

    app.on("window-all-closed", () => {
        app.quit();
    });
});
