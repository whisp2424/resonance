import type { Shortcut } from "@main/shortcuts/types";
import type { Input } from "electron";

import { shortcuts } from "@main/shortcuts/index";
import { windowManager } from "@main/window/windowManager";

const windowListeners = new Map<
    string,
    (event: unknown, input: unknown) => void
>();

export function registerWindowShortcut(shortcut: Shortcut): void {
    const window = windowManager.getWindow(shortcut.windowId!);
    if (!window) return;

    const listener = (event: unknown, input: unknown) => {
        const inputEvent = input as Input;
        if (matchesShortcut(inputEvent, shortcut.accelerator)) {
            const e = event as { preventDefault: () => void };
            e.preventDefault();
            shortcut.callback();
        }
    };

    window.webContents.on("before-input-event", listener);
    windowListeners.set(shortcut.accelerator, listener);
}

export function unregisterWindowShortcut(accelerator: string): void {
    const listener = windowListeners.get(accelerator);
    const shortcut = shortcuts.get(accelerator);

    if (listener && shortcut?.windowId) {
        const window = windowManager.getWindow(shortcut.windowId);

        if (window) {
            window.webContents.off(
                "before-input-event" as never,
                listener as never,
            );
        }

        windowListeners.delete(accelerator);
    }
}

function matchesShortcut(input: Input, accelerator: string): boolean {
    const parts = accelerator.split("+");
    const key = parts.at(-1)?.toLowerCase();
    const modifiers = parts.slice(0, -1);

    if (key && input.key !== key) return false;

    const hasCtrl =
        modifiers.includes("Ctrl") || modifiers.includes("CmdOrCtrl");
    const hasCmd = modifiers.includes("Cmd") || modifiers.includes("CmdOrCtrl");
    const hasShift = modifiers.includes("Shift");
    const hasAlt = modifiers.includes("Alt");

    const expectedCmdOrCtrl =
        process.platform === "darwin" ? input.meta : input.control;

    return (
        expectedCmdOrCtrl === (hasCtrl || hasCmd) &&
        input.shift === hasShift &&
        input.alt === hasAlt
    );
}
