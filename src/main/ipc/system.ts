import type { MainIpcHandleEvents } from "@shared/types/ipc";
import type { SystemPreferences } from "electron";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { windowManager } from "@main/window/windowManager";

let lastAccentColor: string | null = null;

export const registerSystemHandlers = (preferences: SystemPreferences) => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    const handleAccentColorChange = (_: Electron.Event, newColor: string) => {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            windowManager.emitEvent("system:onAccentColorChanged", newColor);
        }
    };

    ipc.handle("system:getAccentColor", () => {
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
