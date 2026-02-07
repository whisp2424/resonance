import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { DialogOptions, DialogResult } from "@shared/types/dialog";
import type { MainIpcHandleEvents } from "@shared/types/ipc";
import type {
    IpcMainInvokeEvent,
    MessageBoxOptions,
    OpenDialogOptions,
} from "electron";

import { BrowserWindow, dialog } from "electron";

import product from "@main/../../build/product.json" with { type: "json" };

export function registerDialogHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle(
        "dialog:open",
        async (
            event: IpcMainInvokeEvent,
            options: DialogOptions,
        ): Promise<DialogResult> => {
            const parentWindow = BrowserWindow.fromWebContents(event.sender);
            const messageBoxOptions: MessageBoxOptions = {
                type: options.type,
                title: product.name.short,
                message: options.title,
                detail: options.description,
                noLink: true,
                buttons:
                    options.buttons?.map((button) => button.label) ??
                    (options.type === "question" ? ["Cancel", "OK"] : ["OK"]),
                defaultId:
                    options.buttons?.findIndex((button) => button.default) ??
                    (options.type === "question" ? 1 : 0),
            };

            const result = parentWindow
                ? dialog.showMessageBoxSync(parentWindow, messageBoxOptions)
                : dialog.showMessageBoxSync(messageBoxOptions);
            const buttonValue = options.buttons?.[result]?.value;

            if (buttonValue) return buttonValue;
            if (options.type === "question")
                return result === 1 ? "ok" : "cancel";

            return "ok";
        },
    );

    ipc.handle(
        "dialog:pickFolder",
        async (
            event: IpcMainInvokeEvent,
            title?: string,
        ): Promise<string | null> => {
            const parentWindow = BrowserWindow.fromWebContents(event.sender);
            const options: OpenDialogOptions = {
                properties: ["openDirectory"],
                title,
            };

            const result = parentWindow
                ? await dialog.showOpenDialog(parentWindow, options)
                : await dialog.showOpenDialog(options);

            if (result.canceled || result.filePaths.length === 0) return null;
            return result.filePaths[0];
        },
    );
}
