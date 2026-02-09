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
    handler: (e: KeyboardEvent) => void,
) {
    const { code, ctrlOrCmd = false, shift = false, alt = false } = config;
    const handlerRef = useRef(handler);

    useEffect(() => {
        handlerRef.current = handler;
    }, [handler]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.code.toLowerCase() !== code.toLowerCase()) return;

            const isMod = isMac() ? e.metaKey : e.ctrlKey;
            if (!!ctrlOrCmd !== isMod) return;
            if (!!alt !== e.altKey) return;
            if (!!shift !== e.shiftKey) return;

            e.preventDefault();
            handlerRef.current(e);
        };

        window.addEventListener("keydown", onKeyDown);

        return () => {
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [code, ctrlOrCmd, shift, alt]);
}
