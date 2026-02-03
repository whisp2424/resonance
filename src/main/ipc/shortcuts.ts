import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";
import type { ShortcutOptions } from "@shared/types/shortcut";

import { registerShortcut, unregisterShortcut } from "@main/shortcuts";
import { windowManager } from "@main/window/windowManager";

export const registerShortcutHandlers = (
    ipc: IpcListener<MainIpcHandleEvents>,
) => {
    ipc.handle("shortcut:register", (_, options: ShortcutOptions) => {
        return registerShortcut({
            ...options,
            callback: () => {
                const window = options.windowId
                    ? windowManager.getWindow(options.windowId)
                    : undefined;

                if (window && !window.isDestroyed())
                    windowManager.emitEvent("shortcut:onPressed", options);
            },
        });
    });

    ipc.handle("shortcut:unregister", (_, accelerator: string) => {
        unregisterShortcut(accelerator);
    });
};
