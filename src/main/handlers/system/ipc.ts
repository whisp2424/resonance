import type { BrowserWindow, Event, SystemPreferences } from "electron";

import { IPC_CHANNELS } from "@/handlers/channels";

let lastAccentColor: string | null = null;

export const registerSystemHandlers = (
    mainWindow: BrowserWindow,
    preferences: SystemPreferences,
) => {
    const { SYSTEM } = IPC_CHANNELS;

    const handleAccentColorChange = (_: Event, newColor: string) => {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            mainWindow.webContents.send(
                SYSTEM.ON_ACCENT_COLOR_CHANGED,
                newColor,
            );
        }
    };

    const cleanup = () => {
        preferences.removeListener(
            "accent-color-changed",
            handleAccentColorChange,
        );
    };

    mainWindow.webContents.ipc.handle(SYSTEM.GET_ACCENT_COLOR, () => {
        return preferences.getAccentColor();
    });

    preferences.on("accent-color-changed", handleAccentColorChange);
    mainWindow.on("closed", cleanup);
};
