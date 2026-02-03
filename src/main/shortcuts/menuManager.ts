import type { Shortcut } from "@main/shortcuts/types";

import { Menu } from "electron";

const appShortcuts = new Map<string, Shortcut>();

export function registerAppShortcut(shortcut: Shortcut): void {
    appShortcuts.set(shortcut.accelerator, shortcut);
    rebuildMenu();
}

export function unregisterAppShortcut(accelerator: string): void {
    appShortcuts.delete(accelerator);
    rebuildMenu();
}

function rebuildMenu(): void {
    const submenu = [...appShortcuts.values()].map((shortcut) => ({
        id: shortcut.accelerator,
        label: shortcut.accelerator,
        accelerator: shortcut.accelerator,
        click: shortcut.callback,
    }));

    const menu = Menu.buildFromTemplate([
        { label: "Shortcuts", submenu, visible: false },
    ]);

    Menu.setApplicationMenu(menu);
}
