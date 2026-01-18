import type { MainIpcHandleEvents } from "@shared/types/ipc";
import type { Event, SystemPreferences } from "electron";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { windowManager } from "@main/windowManager";
import { nativeTheme } from "electron";

let lastAccentColor: string | null = null;

export const registerSystemHandlers = (preferences: SystemPreferences) => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    const handleAccentColorChange = (_: Event, newColor: string) => {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            windowManager.emitEvent("system:accentColorChanged", newColor);
        }
    };

    const handleThemeChange = () => {
        windowManager.emitEvent(
            "system:darkModeChanged",
            nativeTheme.shouldUseDarkColors,
        );
    };

    ipc.handle("system:accentColor", () => {
        return preferences.getAccentColor();
    });

    ipc.handle("system:darkMode", () => {
        return nativeTheme.shouldUseDarkColors;
    });

    preferences.on("accent-color-changed", handleAccentColorChange);
    nativeTheme.on("updated", handleThemeChange);

    return () => {
        preferences.removeListener(
            "accent-color-changed",
            handleAccentColorChange,
        );
        nativeTheme.removeListener("updated", handleThemeChange);
    };
};
