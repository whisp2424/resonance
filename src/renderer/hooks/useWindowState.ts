import type { TitleBarControls } from "@shared/types/ipc";

import { useEffect, useState } from "react";

export function useWindowState() {
    const [windowId, setWindowId] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [controls, setControls] = useState<TitleBarControls>({});

    useEffect(() => {
        let mounted = true;

        (async () => {
            const id = await electron.invoke("window:getId");
            if (!mounted || !id) return;

            const [fullscreen, maximized, windowControls] = await Promise.all([
                electron.invoke("window:isFullscreen", id),
                electron.invoke("window:isMaximized", id),
                electron.invoke("window:getControls", id),
            ]);

            setWindowId(id);
            setIsFullscreen(fullscreen);
            setIsMaximized(maximized);
            setControls(windowControls);
        })();

        const handleFocus = () => setIsWindowFocused(true);
        const handleBlur = () => setIsWindowFocused(false);

        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        const cleanupEnter = electron.send("window:onEnterFullscreen", () =>
            setIsFullscreen(true),
        );
        const cleanupLeave = electron.send("window:onLeaveFullscreen", () =>
            setIsFullscreen(false),
        );

        const cleanupMaximize = electron.send("window:onMaximize", () =>
            setIsMaximized(true),
        );
        const cleanupUnmaximize = electron.send("window:onUnmaximize", () =>
            setIsMaximized(false),
        );

        return () => {
            mounted = false;
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
            cleanupEnter?.();
            cleanupLeave?.();
            cleanupMaximize?.();
            cleanupUnmaximize?.();
        };
    }, []);

    return {
        windowId,
        isFullscreen,
        isMaximized,
        isWindowFocused,
        controls,
    };
}
