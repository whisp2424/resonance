import type { MainIpcHandleEvents } from "@shared/types/ipc";
import type { Event, SystemPreferences } from "electron";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { windowManager } from "@main/windowManager";

let lastAccentColor: string | null = null;

export const registerSystemHandlers = (preferences: SystemPreferences) => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    const handleAccentColorChange = (_: Event, newColor: string) => {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            windowManager.emitEvent("system:accentColorChanged", newColor);
        }
    };

    ipc.handle("system:accentColor", () => {
        return preferences.getAccentColor();
    });

    preferences.on("accent-color-changed", handleAccentColorChange);

    return () => {
        preferences.removeListener(
            "accent-color-changed",
            handleAccentColorChange,
        );
    };
};
