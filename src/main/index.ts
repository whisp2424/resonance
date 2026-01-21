import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import trayIconDark from "@main/../../build/tray-dark.png?asset";
import trayIconLight from "@main/../../build/tray-light.png?asset";
import { registerSettingsHandlers } from "@main/handlers/settings/ipc";
import { registerSystemHandlers } from "@main/handlers/system/ipc";
import { registerWindowHandlers } from "@main/handlers/window/ipc";
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

const getTrayIcon = () =>
    nativeTheme.shouldUseDarkColors ? trayIconDark : trayIconLight;

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
        if (tray) {
            tray.setImage(getTrayIcon());
        }
    });
};

const createMainWindow = (): BrowserWindow => {
    const savedState = getWindowState("main");
    const options = { ...BASE_OPTIONS };

    if (savedState) {
        if (savedState.x !== undefined && savedState.y !== undefined) {
            options.x = savedState.x;
            options.y = savedState.y;
        }
        if (savedState.width !== undefined && savedState.height !== undefined) {
            options.width = savedState.width;
            options.height = savedState.height;
        }
    }

    const mainWindow = new BrowserWindow(options);

    mainWindow.on("ready-to-show", () => {
        if (savedState?.isMaximized) {
            mainWindow.maximize();
        }
        if (savedState?.isFullscreen) {
            mainWindow.setFullScreen(true);
        }
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

    app.on("window-all-closed", () => {
        cleanupSystemHandlers();
        app.quit();
    });
});
