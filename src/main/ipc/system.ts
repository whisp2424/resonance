import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";
import type { SystemPreferences } from "electron";

import { platform } from "@electron-toolkit/utils";
import { windowManager } from "@main/window/windowManager";

let lastAccentColor: string | null = null;

export function registerSystemHandlers(
    ipc: IpcListener<MainIpcHandleEvents>,
    preferences: SystemPreferences,
) {
    function handleAccentColorChange(_, newColor: string) {
        if (newColor !== lastAccentColor) {
            lastAccentColor = newColor;
            windowManager.emitEvent("system:onAccentColorChanged", newColor);
        }
    }

    ipc.handle("system:getAccentColor", () => {
        return preferences.getAccentColor();
    });

    ipc.handle("system:isWindows", () => platform.isWindows);
    ipc.handle("system:isMac", () => platform.isMacOS);
    ipc.handle("system:isLinux", () => platform.isLinux);

    preferences.on("accent-color-changed", handleAccentColorChange);

    return () => {
        preferences.removeListener(
            "accent-color-changed",
            handleAccentColorChange,
        );
    };
}
