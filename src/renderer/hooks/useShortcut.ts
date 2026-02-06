import { isMac } from "@renderer/utils/os";
import { useEffect, useRef } from "react";

type ShortcutConfig = {
    code: string;
    ctrlOrCmd?: boolean;
    shift?: boolean;
    alt?: boolean;
};

export function useShortcut(
    config: ShortcutConfig,
    handler: (event: KeyboardEvent) => void,
) {
    const { code, ctrlOrCmd = false, shift = false, alt = false } = config;
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.code.toLowerCase() !== code.toLowerCase()) return;

            const isMod = isMac() ? event.metaKey : event.ctrlKey;
            if (!!ctrlOrCmd !== isMod) return;
            if (!!alt !== event.altKey) return;
            if (!!shift !== event.shiftKey) return;

            event.preventDefault();
            handlerRef.current(event);
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [code, ctrlOrCmd, shift, alt]);
}
