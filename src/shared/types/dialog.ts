export type DialogType = "info" | "warning" | "error" | "question";

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
    id?: string;
    buttons?: DialogButton[];
}

export type DialogResult = string | null;
