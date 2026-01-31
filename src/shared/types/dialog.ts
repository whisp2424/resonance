export type DialogType = "info" | "warning" | "error" | "confirm";

export interface DialogButton {
    label: string;
    value: string;
    variant?: "primary" | "secondary";
    default?: boolean;
}

export interface DialogOptions {
    type: DialogType;
    title: string;
    description: string;
    buttons?: DialogButton[];
    cancelable?: boolean;
    id?: string;
}

export type DialogResult = string | null;
