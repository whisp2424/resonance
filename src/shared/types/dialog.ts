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
    id: string;
    buttons?: DialogButton[];
    cancelable?: boolean;
    width?: number;
    height?: number;
}

export type DialogResult = string | null;
