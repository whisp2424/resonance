import type { MainIpcHandleEvents } from "@shared/types/ipc";
import type { Event, SystemPreferences } from "electron";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { windowManager } from "@main/window/windowManager";
import { nativeTheme } from "electron";

let lastAccentColor: string | null = null;

export const registerSystemHandlers = (preferences: SystemPreferences) => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    const handleAccentColorChange = (_: Event, newColor: string) => {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            windowManager.emitEvent("system:onAccentColorChanged", newColor);
        }
    };

    const handleThemeChange = () => {
        windowManager.emitEvent(
            "system:onDarkModeChanged",
            nativeTheme.shouldUseDarkColors,
        );
    };

    ipc.handle("system:getAccentColor", () => {
        return preferences.getAccentColor();
    });

    ipc.handle("system:isDarkMode", () => {
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
