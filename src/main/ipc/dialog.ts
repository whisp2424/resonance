import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { DialogOptions, DialogResult } from "@shared/types/dialog";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { dialog } from "electron";

import product from "@main/../../build/product.json" with { type: "json" };

export const registerDialogHandlers = (
    ipc: IpcListener<MainIpcHandleEvents>,
) => {
    ipc.handle(
        "dialog:open",
        async (
            _: Electron.IpcMainInvokeEvent,
            options: DialogOptions,
        ): Promise<DialogResult> => {
            const messageBoxOptions: Electron.MessageBoxOptions = {
                type: options.type,
                title: product.name.short,
                message: options.title,
                detail: options.description,
                buttons:
                    options.buttons?.map((button) => button.label) ??
                    (options.type === "question" ? ["Cancel", "OK"] : ["OK"]),
                defaultId:
                    options.buttons?.findIndex((button) => button.default) ??
                    (options.type === "question" ? 1 : 0),
                cancelId: options.cancelable
                    ? options.type === "question"
                        ? 0
                        : undefined
                    : undefined,
                noLink: true,
            };

            const result = dialog.showMessageBoxSync(messageBoxOptions);
            const buttonValue = options.buttons?.[result]?.value;

            if (buttonValue) {
                return buttonValue;
            }

            if (options.type === "question") {
                return result === 1 ? "ok" : "cancel";
            }

            return "ok";
        },
    );
};
