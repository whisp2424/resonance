import type { BrowserWindow, SystemPreferences } from "electron";

import { IPC_CHANNELS } from "@/ipc/channels";

let lastAccentColor: string | null = null;

export const registerSystemHandlers = (
    mainWindow: BrowserWindow,
    preferences: SystemPreferences,
) => {
    const { SYSTEM } = IPC_CHANNELS;

    const handleAccentColorChange = (
        _event: Electron.Event,
        newColor: string,
    ) => {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            mainWindow.webContents.send(SYSTEM.ACCENT_COLOR_CHANGED, newColor);
        }
    };

    const cleanup = () => {
        preferences.removeListener(
            "accent-color-changed",
            handleAccentColorChange,
        );
    };

    mainWindow.webContents.ipc.handle(SYSTEM.ACCENT_COLOR, () => {
        return preferences.getAccentColor();
    });

    preferences.on("accent-color-changed", handleAccentColorChange);
    mainWindow.on("closed", cleanup);
};
