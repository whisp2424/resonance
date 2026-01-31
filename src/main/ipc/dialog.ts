import type { DialogOptions, DialogResult } from "@shared/types/dialog";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { IpcListener } from "@electron-toolkit/typed-ipc/main";
import { windowManager } from "@main/window/windowManager";

class DialogManager {
    private options = new Map<string, DialogOptions>();
    private pending = new Map<
        string,
        {
            resolve: (result: DialogResult) => void;
            reject: (error: Error) => void;
        }
    >();

    openDialog(
        event: Electron.IpcMainInvokeEvent,
        options: DialogOptions,
    ): Promise<DialogResult> {
        let dialogId: string;
        let route: "/dialog" | "/modal";

        if (options.id) {
            const existing = this.pending.get(options.id);
            if (existing) {
                const win = windowManager.getWindow(options.id);
                if (win) {
                    if (win.isMinimized()) win.restore();
                    if (!win.isVisible()) win.show();
                    win.focus();
                }
                return new Promise((resolve) => {
                    existing.resolve = resolve;
                });
            }
            dialogId = options.id;
            route = "/modal";
        } else {
            do {
                dialogId = `dialog-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
            } while (
                this.pending.has(dialogId) ||
                windowManager.getWindow(dialogId)
            );
            route = "/dialog";
        }

        const parentId = windowManager.getWindowId(event.sender);

        return new Promise((resolve, reject) => {
            this.options.set(dialogId, options);
            this.pending.set(dialogId, { resolve, reject });

            try {
                windowManager.createWindow(
                    dialogId,
                    route,
                    parentId ?? undefined,
                );
            } catch (error) {
                this.options.delete(dialogId);
                this.pending.delete(dialogId);
                reject(error as Error);
            }
        });
    }

    getOptions(windowId: string): DialogOptions | null {
        return this.options.get(windowId) ?? null;
    }

    closeDialog(windowId: string, result?: DialogResult): void {
        const pending = this.pending.get(windowId);
        if (pending) {
            pending.resolve(result ?? null);
            this.pending.delete(windowId);
        }

        this.options.delete(windowId);
        windowManager.closeWindow(windowId);
    }
}

const dialogManager = new DialogManager();

export const registerDialogHandlers = () => {
    const ipc = new IpcListener<MainIpcHandleEvents>();

    ipc.handle(
        "dialog:open",
        (event: Electron.IpcMainInvokeEvent, options: DialogOptions) => {
            return dialogManager.openDialog(event, options);
        },
    );

    ipc.handle(
        "dialog:getOptions",
        (_: Electron.IpcMainInvokeEvent, windowId: string) => {
            return dialogManager.getOptions(windowId);
        },
    );

    ipc.handle(
        "dialog:close",
        (
            _: Electron.IpcMainInvokeEvent,
            windowId: string,
            result?: DialogResult,
        ) => {
            dialogManager.closeDialog(windowId, result);
        },
    );
};
