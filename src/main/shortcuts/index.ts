import type { Shortcut } from "@main/shortcuts/types";
import type { ShortcutInfo, ShortcutOptions } from "@shared/types/shortcut";

import {
    registerAppShortcut,
    unregisterAppShortcut,
} from "@main/shortcuts/menuManager";
import {
    registerWindowShortcut,
    unregisterWindowShortcut,
} from "@main/shortcuts/windowManager";
import { log } from "@shared/utils/logger";

export const shortcuts = new Map<string, Shortcut>();

export function registerShortcut(
    options: ShortcutOptions & { callback: () => void },
): string {
    const accelerator = options.accelerator;

    const conflict = findConflictingShortcut(
        accelerator,
        options.scope,
        options.windowId,
    );

    if (conflict) {
        log(
            `shortcut ${accelerator} already registered, will be replaced`,
            "shortcuts",
            "warning",
        );
        unregisterShortcut(accelerator);
    }

    const shortcut: ShortcutInfo = {
        accelerator,
        scope: options.scope,
        windowId: options.windowId,
        callback: options.callback,
    };

    shortcuts.set(accelerator, shortcut);
    if (options.scope === "app") {
        registerAppShortcut(shortcut);
    } else if (options.scope === "window" && options.windowId) {
        registerWindowShortcut(shortcut);
    }

    return accelerator;
}

export function unregisterShortcut(accelerator: string): void {
    const shortcut = shortcuts.get(accelerator);
    if (!shortcut) return;

    if (shortcut.scope === "app") {
        unregisterAppShortcut(accelerator);
    } else if (shortcut.scope === "window") {
        unregisterWindowShortcut(accelerator);
    }

    shortcuts.delete(accelerator);
}

function findConflictingShortcut(
    accelerator: string,
    scope: "app" | "window",
    windowId?: string,
): ShortcutInfo | undefined {
    const shortcut = shortcuts.get(accelerator);
    if (!shortcut) return undefined;

    if (shortcut.scope === "app" && scope === "app") return shortcut;

    if (
        shortcut.scope === "window" &&
        scope === "window" &&
        shortcut.windowId === windowId
    ) {
        return shortcut;
    }

    return undefined;
}
