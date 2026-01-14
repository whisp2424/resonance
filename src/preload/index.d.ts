interface ElectronAPIWindow {
    close: () => Promise<void>;

    maximize: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    onMaximized: (callback: () => void) => () => void;

    unmaximize: () => Promise<void>;
    minimize: () => Promise<void>;

    isFullscreen: () => Promise<boolean>;
    onFullscreenChange: (
        callback: (isFullscreen: boolean) => void,
    ) => () => void;

    getTitle: () => Promise<string>;
    setTitle: (title: string) => Promise<void>;
    onTitleChanged: (callback: () => void) => () => void;
}

interface ElectronAPISystem {
    getAccentColor: () => Promise<string>;
    onAccentColorChanged: (callback: (color: string) => void) => () => void;
}

interface ElectronAPI {
    window: ElectronAPIWindow;
    system: ElectronAPISystem;
}

declare global {
    const electron: ElectronAPI;

    interface Window {
        electron: ElectronAPI;
    }
}

export {};
