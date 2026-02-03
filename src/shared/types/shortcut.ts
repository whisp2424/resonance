export interface ShortcutOptions {
    accelerator: string;
    scope: "app" | "window";
    windowId?: string;
}

export interface ShortcutInfo extends ShortcutOptions {
    callback: () => void;
}
