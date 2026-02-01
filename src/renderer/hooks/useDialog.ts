import type { DialogOptions, DialogResult } from "@shared/types/dialog";

export function useDialog() {
    return {
        openDialog: (options: DialogOptions): Promise<DialogResult> =>
            electron.invoke("dialog:open", options),
    };
}
