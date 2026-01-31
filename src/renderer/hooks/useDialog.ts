import type { DialogOptions } from "@shared/types/dialog";

export function useDialog() {
    return {
        openDialog: (options: DialogOptions) =>
            electron.invoke("dialog:open", options),
    };
}
