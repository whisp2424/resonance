declare global {
    interface Window {
        electron: {
            closeWindow: () => Promise<void>;
            maximizeWindow: () => Promise<void>;
            unmaximizeWindow: () => Promise<void>;
            minimizeWindow: () => Promise<void>;
            isWindowMaximized: () => Promise<boolean>;
            isWindowFullscreen: () => Promise<boolean>;
            onWindowFullscreen: (callback: () => void) => void;
            onWindowMaximize: (callback: () => void) => void;
            removeListeners: (channel: string) => void;
        };
    }
}

export {};
