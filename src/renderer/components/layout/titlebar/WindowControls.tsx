import { useCallback } from "react";

import { TitleBarButton } from "./TitleBarButton";

import IconX from "~icons/fluent/dismiss-16-regular";
import IconMaximize from "~icons/fluent/maximize-16-regular";
import IconMinimize from "~icons/fluent/minimize-16-regular";
import IconRestore from "~icons/fluent/square-multiple-16-regular";

interface WindowControlsProps {
    windowId: string | null;
    isMaximized: boolean;
    controls: {
        minimize?: boolean;
        maximize?: boolean;
        close?: boolean;
    };
}

export function WindowControls({
    windowId,
    isMaximized,
    controls,
}: WindowControlsProps) {
    const handleMinimize = useCallback(() => {
        if (windowId) electron.invoke("window:minimize", windowId);
    }, [windowId]);

    const handleMaximize = useCallback(async () => {
        if (!windowId) return;

        if (isMaximized) {
            await electron.invoke("window:unmaximize", windowId);
        } else {
            await electron.invoke("window:maximize", windowId);
        }
    }, [windowId, isMaximized]);

    const handleClose = useCallback(() => {
        if (windowId) electron.invoke("window:close", windowId);
    }, [windowId]);

    return (
        <>
            {controls.minimize === true && (
                <TitleBarButton
                    icon={<IconMinimize className="size-full" />}
                    onClick={handleMinimize}
                />
            )}
            {controls.maximize === true && (
                <TitleBarButton
                    icon={
                        isMaximized ? (
                            <IconRestore className="size-full" />
                        ) : (
                            <IconMaximize className="size-full" />
                        )
                    }
                    onClick={handleMaximize}
                />
            )}
            {controls.close === true && (
                <TitleBarButton
                    icon={<IconX className="size-full" />}
                    className="hover:bg-red-500! hover:text-white"
                    onClick={handleClose}
                />
            )}
        </>
    );
}
