import type { IconElement } from "@renderer/types/iconElement";
import type { TitleBarControls } from "@shared/types/ipc";
import type { ButtonHTMLAttributes } from "react";

import TabsContainer from "@renderer/components/layout/TabsContainer";
import { clsx } from "clsx";
import { memo, useCallback, useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import IconX from "~icons/fluent/dismiss-16-regular";
import IconMaximize from "~icons/fluent/maximize-16-regular";
import IconMinimize from "~icons/fluent/minimize-16-regular";
import IconRestore from "~icons/fluent/square-multiple-16-regular";

interface TitleBarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconElement;
}

const TitleBarButton = memo(function TitleBarButton({
    icon: Icon,
    className,
    onClick,
}: TitleBarButtonProps) {
    return (
        <button
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            className={twMerge(
                clsx(
                    "no-drag flex h-full w-12 items-center justify-center transition duration-250 hover:bg-black/10 hover:duration-0 dark:hover:bg-white/10",
                    className,
                ),
            )}
            onClick={onClick}>
            <Icon className="size-4 scale-105" />
        </button>
    );
});

const CloseButton = memo(function CloseButton({
    windowId,
}: {
    windowId: string | null;
}) {
    const handleClick = useCallback(() => {
        if (windowId) electron.invoke("window:close", windowId);
    }, [windowId]);

    return (
        <TitleBarButton
            icon={IconX}
            className="hover:bg-red-500! hover:text-white"
            onClick={handleClick}
        />
    );
});

const MaximizeButton = memo(function MaximizeButton({
    windowId,
}: {
    windowId: string | null;
}) {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        if (!windowId) return;

        let mounted = true;

        (async () => {
            const maximized = await electron.invoke(
                "window:isMaximized",
                windowId,
            );
            if (mounted) setIsMaximized(maximized);
        })();

        async function updateMaximized() {
            if (!windowId) return;
            const maximized = await electron.invoke(
                "window:isMaximized",
                windowId,
            );
            if (mounted) setIsMaximized(maximized);
        }

        const cleanupOnMaximize = electron.send(
            "window:onMaximize",
            updateMaximized,
        );

        const cleanupOnUnmaximize = electron.send(
            "window:onUnmaximize",
            updateMaximized,
        );

        return () => {
            mounted = false;
            cleanupOnMaximize?.();
            cleanupOnUnmaximize?.();
        };
    }, [windowId]);

    const toggleMaximize = useCallback(async () => {
        if (!windowId) return;

        const maximized = await electron.invoke("window:isMaximized", windowId);

        if (maximized) {
            await electron.invoke("window:unmaximize", windowId);
        } else {
            await electron.invoke("window:maximize", windowId);
        }
    }, [windowId]);

    return (
        <TitleBarButton
            icon={isMaximized ? IconRestore : IconMaximize}
            onClick={toggleMaximize}
        />
    );
});

const MinimizeButton = memo(function MinimizeButton({
    windowId,
}: {
    windowId: string | null;
}) {
    const handleClick = useCallback(() => {
        if (windowId) electron.invoke("window:minimize", windowId);
    }, [windowId]);

    return <TitleBarButton icon={IconMinimize} onClick={handleClick} />;
});

export default function TitleBar() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [windowId, setWindowId] = useState<string | null>(null);
    const [controls, setControls] = useState<TitleBarControls>({});

    useEffect(() => {
        let mounted = true;

        (async () => {
            const id = await electron.invoke("window:getId");
            if (mounted) setWindowId(id);
        })();

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!windowId) return;

        let mounted = true;

        (async () => {
            const [fullscreen, windowControls] = await Promise.all([
                electron.invoke("window:isFullscreen", windowId),
                electron.invoke("window:getControls", windowId),
            ]);

            if (mounted) {
                setIsFullscreen(fullscreen);
                setControls(windowControls);
            }
        })();

        const handleFocus = () => setIsWindowFocused(true);
        const handleBlur = () => setIsWindowFocused(false);

        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        const onEnterFullscreen = () => mounted && setIsFullscreen(true);
        const onLeaveFullscreen = () => mounted && setIsFullscreen(false);

        const cleanupOnEnterFullscreen = electron.send(
            "window:onEnterFullscreen",
            onEnterFullscreen,
        );

        const cleanupOnLeaveFullscreen = electron.send(
            "window:onLeaveFullscreen",
            onLeaveFullscreen,
        );

        return () => {
            mounted = false;
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
            cleanupOnEnterFullscreen?.();
            cleanupOnLeaveFullscreen?.();
        };
    }, [windowId]);

    return (
        <div className="drag fixed z-50 flex h-(--spacing-titlebar-height) w-full flex-row items-center justify-end bg-neutral-50/40 bg-linear-to-t backdrop-blur-sm transition duration-300 ease-out dark:bg-neutral-900/40">
            {windowId === "main" && <TabsContainer />}
            {!isFullscreen && <div className="drag h-full w-8" />}
            {!isFullscreen && (
                <div
                    className={twMerge(
                        clsx(
                            "flex h-full flex-row items-center justify-end",
                            !isWindowFocused &&
                                "text-black/50 dark:text-white/50",
                        ),
                    )}>
                    {controls.minimize === true && (
                        <MinimizeButton windowId={windowId} />
                    )}
                    {controls.maximize === true && (
                        <MaximizeButton windowId={windowId} />
                    )}
                    {controls.close === true && (
                        <CloseButton windowId={windowId} />
                    )}
                </div>
            )}
        </div>
    );
}
