import type { IconElement } from "@renderer/types/iconElement";
import type { TitleBarControls } from "@shared/types/ipc";
import type { ButtonHTMLAttributes } from "react";

import Logo from "@renderer/assets/resonance-logo.svg?react";
import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import IconX from "~icons/fluent/dismiss-16-regular";
import IconMaximize from "~icons/fluent/maximize-16-regular";
import IconMinimize from "~icons/fluent/minimize-16-regular";
import IconRestore from "~icons/fluent/square-multiple-16-regular";

interface TitleBarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconElement;
}

function TitleBarButton({
    icon: Icon,
    className,
    ...rest
}: TitleBarButtonProps) {
    return (
        <button
            tabIndex={-1}
            className={clsx(
                "no-drag flex h-full w-12 items-center justify-center transition duration-250 hover:bg-neutral-900 hover:text-white hover:duration-0",
                className,
            )}
            {...rest}>
            <Icon className="size-4 scale-105" />
        </button>
    );
}

function TitleBarButtonClose({ windowId }: { windowId: string }) {
    return (
        <TitleBarButton
            icon={IconX}
            className="hover:bg-red-500"
            onClick={() => electron.invoke("window:close", windowId)}
        />
    );
}

function TitleBarButtonMaximize({ windowId }: { windowId: string }) {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        (async () => {
            setIsMaximized(
                await electron.invoke("window:isMaximized", windowId),
            );
        })();

        const updateMaximized = async () =>
            setIsMaximized(
                await electron.invoke("window:isMaximized", windowId),
            );

        const cleanup = electron.send("window:onMaximize", updateMaximized);
        electron.send("window:onUnmaximize", updateMaximized);

        return cleanup;
    }, [windowId]);

    const toggleMaximize = async () => {
        const maximized = await electron.invoke("window:isMaximized", windowId);

        if (maximized) {
            await electron.invoke("window:unmaximize", windowId);
        } else await electron.invoke("window:maximize", windowId);
    };

    return (
        <TitleBarButton
            icon={isMaximized ? IconRestore : IconMaximize}
            onClick={toggleMaximize}
        />
    );
}

function TitleBarButtonMinimize({ windowId }: { windowId: string }) {
    return (
        <TitleBarButton
            icon={IconMinimize}
            onClick={() => electron.invoke("window:minimize", windowId)}
        />
    );
}

export default function TitleBar() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [windowId, setWindowId] = useState<string | null>(null);
    const [controls, setControls] = useState<TitleBarControls>({});

    useEffect(() => {
        (async () => {
            const id = await electron.getWindowId();
            setWindowId(id);
        })();
    }, []);

    useEffect(() => {
        if (!windowId) return;

        (async () => {
            setIsFullscreen(
                await electron.invoke("window:isFullscreen", windowId),
            );
            const controls = await electron.invoke(
                "window:getControls",
                windowId,
            );
            setControls(controls);
        })();

        window.addEventListener("focus", () => setIsWindowFocused(true));
        window.addEventListener("blur", () => setIsWindowFocused(false));

        const onEnterFullscreen = () => setIsFullscreen(true);
        const onLeaveFullscreen = () => setIsFullscreen(false);

        electron.send("window:onEnterFullscreen", onEnterFullscreen);
        electron.send("window:onLeaveFullscreen", onLeaveFullscreen);

        return () => {
            window.removeEventListener("focus", () => setIsWindowFocused(true));
            window.removeEventListener("blur", () => setIsWindowFocused(false));
            electron.send("window:onEnterFullscreen", onEnterFullscreen)();
            electron.send("window:onLeaveFullscreen", onLeaveFullscreen)();
        };
    }, [windowId]);

    if (isFullscreen || !windowId) return null;

    return (
        <div className="drag flex h-8 w-full flex-row items-center justify-between gap-4 bg-linear-to-t transition duration-300 ease-out">
            <div className="flex h-full flex-1 flex-row items-center justify-start">
                {windowId === "main" && (
                    <Logo className="ml-4 w-34 opacity-30" />
                )}
            </div>
            <div
                className={twMerge(
                    clsx(
                        "flex h-full flex-1 flex-row items-center justify-end",
                        !isWindowFocused && "text-white/50",
                    ),
                )}>
                {controls.minimize !== false && (
                    <TitleBarButtonMinimize windowId={windowId} />
                )}
                {controls.maximize !== false && (
                    <TitleBarButtonMaximize windowId={windowId} />
                )}
                {controls.close !== false && (
                    <TitleBarButtonClose windowId={windowId} />
                )}
            </div>
        </div>
    );
}
