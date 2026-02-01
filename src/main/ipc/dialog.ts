import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { DialogOptions, DialogResult } from "@shared/types/dialog";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

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
        const dialogId = options.id;

        const existing = this.pending.get(dialogId);

        if (existing) {
            const win = windowManager.getWindow(dialogId);
            if (win && !win.isDestroyed()) {
                if (win.isMinimized()) win.restore();
                if (!win.isVisible()) win.show();
                win.focus();

                return new Promise((resolve) => {
                    existing.resolve = resolve;
                });
            }

            this.pending.delete(dialogId);
            this.options.delete(dialogId);
        }

        const parentId = windowManager.getWindowId(event.sender);

        return new Promise((resolve, reject) => {
            this.options.set(dialogId, options);
            this.pending.set(dialogId, { resolve, reject });

            try {
                const customOptions: Partial<Electron.BrowserWindowConstructorOptions> =
                    {};

                if (options.width) customOptions.width = options.width;
                if (options.height) customOptions.height = options.height;

                windowManager.createWindow(
                    dialogId,
                    "/modal",
                    parentId ?? undefined,
                    customOptions,
                );

                const window = windowManager.getWindow(dialogId);

                if (window) {
                    const isCancelable = options.cancelable ?? true;
                    if (!isCancelable) {
                        windowManager.setControls(dialogId, {
                            minimize: false,
                            maximize: false,
                            close: false,
                        });
                    }

                    window.on("close", (event) => {
                        const opts = this.options.get(dialogId);
                        if (opts) {
                            const cancelable = opts.cancelable ?? true;
                            if (!cancelable) event.preventDefault();
                            else this.closeDialog(dialogId, null);
                        }
                    });
                }
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

        const win = windowManager.getWindow(windowId);
        if (win && !win.isDestroyed()) windowManager.closeWindow(windowId);
    }

    resizeDialog(
        windowId: string,
        dimensions: { width: number; height: number },
    ): void {
        const win = windowManager.getWindow(windowId);
        if (win && !win.isDestroyed()) {
            const currentBounds = win.getBounds();

            const needsResize =
                dimensions.width > currentBounds.width ||
                dimensions.height > currentBounds.height;

            if (needsResize) {
                win.setBounds({
                    width: Math.max(currentBounds.width, dimensions.width),
                    height: Math.max(currentBounds.height, dimensions.height),
                });
            }
        }
    }
}

const dialogManager = new DialogManager();

export const registerDialogHandlers = (
    ipc: IpcListener<MainIpcHandleEvents>,
) => {
    ipc.handle(
        "dialog:open",
        (event: Electron.IpcMainInvokeEvent, options: DialogOptions) => {
            return dialogManager.openDialog(event, options);
        },
    );

    ipc.handle("dialog:getOptions", (_, windowId: string) => {
        return dialogManager.getOptions(windowId);
    });

    ipc.handle("dialog:close", (_, windowId: string, result?: DialogResult) => {
        dialogManager.closeDialog(windowId, result);
    });

    ipc.handle(
        "dialog:resize",
        (
            _,
            windowId: string,
            dimensions: { width: number; height: number },
        ) => {
            dialogManager.resizeDialog(windowId, dimensions);
        },
    );
};
