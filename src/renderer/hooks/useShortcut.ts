import { useEffect, useRef } from "react";

interface UseShortcutOptions {
    scope?: "app" | "window";
    windowId?: string;
}

/**
 * React hook to register a keyboard shortcut.
 * Automatically unregisters when component unmounts.
 *
 * @param accelerator - The accelerator string (e.g., "Alt+ArrowLeft")
 * @param callback - Function to call when shortcut is pressed
 * @param options - Optional configuration (scope, windowId)
 *
 * @example
 * useShortcut("Alt+ArrowLeft", () => navigate(-1), { scope: "window", windowId: "main" });
 */
export function useShortcut(
    accelerator: string,
    callback: () => void,
    options: UseShortcutOptions = {},
): void {
    const callbackRef = useRef(callback);

    // Keep callback ref up to date
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        const scope = options.scope ?? "window";
        const windowId = options.windowId ?? "main";

        // Register the shortcut
        electron.invoke("shortcut:register", {
            accelerator,
            scope,
            windowId,
        });

        // Listen for shortcut events
        const unsubscribe = electron.send("shortcut:onPressed", (opts) => {
            if (opts.accelerator === accelerator) {
                callbackRef.current();
            }
        });

        // Cleanup on unmount
        return () => {
            unsubscribe();
            electron.invoke("shortcut:unregister", accelerator);
        };
    }, [accelerator, options.scope, options.windowId]);
}
