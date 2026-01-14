declare global {
    interface Window {
        electronAPI: {
            closeWindow: () => Promise<void>;
            maximizeWindow: () => Promise<void>;
            unmaximizeWindow: () => Promise<void>;
            minimizeWindow: () => Promise<void>;
            isWindowMaximized: () => Promise<boolean>;
            isWindowFullscreen: () => Promise<boolean>;
            onWindowFullscreen: (callback: () => void) => void;
            onWindowMaximize: (callback: () => void) => void;
            getWindowTitle: () => Promise<string>;
            onWindowTitleChanged: (callback: () => void) => void;
            getAccentColor: () => Promise<string>;
            onAccentColorChange: (callback: (color: string) => void) => void;
            removeListeners: (channel: string) => void;
        };
    }
}

export {};
