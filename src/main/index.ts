import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import trayDarkIcon from "@main/../../build/tray-dark.png?asset";
import trayLightIcon from "@main/../../build/tray-light.png?asset";
import { registerSystemHandlers } from "@main/handlers/system/ipc";
import { registerWindowHandlers } from "@main/handlers/window/ipc";
import { windowManager } from "@main/windowManager";
import { BASE_OPTIONS } from "@main/windowPolicies";
import {
    BrowserWindow,
    Menu,
    Tray,
    app,
    nativeTheme,
    shell,
    systemPreferences,
} from "electron";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

const updateTrayIcon = (): void => {
    if (tray) {
        const isDarkMode = nativeTheme.shouldUseDarkColors;
        tray.setImage(isDarkMode ? trayDarkIcon : trayLightIcon);
    }
};

const createTray = (): void => {
    tray = new Tray(
        nativeTheme.shouldUseDarkColors ? trayDarkIcon : trayLightIcon,
    );
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

    nativeTheme.on("updated", updateTrayIcon);
};

const createWindow = (): BrowserWindow => {
    const mainWindow = new BrowserWindow(BASE_OPTIONS);

    mainWindow.on("ready-to-show", () => {
        mainWindow.show();
    });

    mainWindow.on("close", (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow.hide();
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

    windowManager.addWindow("main", mainWindow, "/", {});

    return mainWindow;
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
    app.setAppUserModelId("app.whisp.resonance");
    mainWindow = createWindow();
    createTray();

    registerWindowHandlers();
    const cleanupSystemHandlers = registerSystemHandlers(systemPreferences);

    app.on("window-all-closed", () => {
        cleanupSystemHandlers();
        app.quit();
    });
});
