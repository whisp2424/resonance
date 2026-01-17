import type {
    MainIpcHandleEvents,
    MainIpcListenEvents,
} from "@shared/types/ipc";
import type { BrowserWindow, Event, SystemPreferences } from "electron";

import { IpcEmitter, IpcListener } from "@electron-toolkit/typed-ipc/main";

let lastAccentColor: string | null = null;

export const registerSystemHandlers = (
    mainWindow: BrowserWindow,
    preferences: SystemPreferences,
) => {
    const ipc = new IpcListener<MainIpcHandleEvents>();
    const emitter = new IpcEmitter<MainIpcListenEvents>();

    const handleAccentColorChange = (_: Event, newColor: string) => {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            emitter.send(
                mainWindow.webContents,
                "system:accentColorChanged",
                newColor,
            );
        }
    };

    ipc.handle("system:accentColor", () => {
        return preferences.getAccentColor();
    });

    preferences.on("accent-color-changed", handleAccentColorChange);
    mainWindow.on("closed", () => {
        preferences.removeListener(
            "accent-color-changed",
            handleAccentColorChange,
        );
    });
};
