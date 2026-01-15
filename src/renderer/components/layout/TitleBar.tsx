import type { ButtonHTMLAttributes } from "react";
import type { IconElement } from "@/types/iconElement";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import Logo from "@/assets/resonance-logo.svg?react";
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

function TitleBarButtonClose() {
    return (
        <TitleBarButton
            icon={IconX}
            className="hover:bg-red-500"
            onClick={() => electron.window.close()}
        />
    );
}

function TitleBarButtonMaximize() {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        (async () => {
            setIsMaximized(await electron.window.isMaximized());
        })();

        const updateMaximized = async () => {
            setIsMaximized(await electron.window.isMaximized());
        };

        const cleanup = electron.window.onMaximized(updateMaximized);

        return cleanup;
    }, []);

    const toggleMaximize = async () => {
        const maximized = await electron.window.isMaximized();

        if (maximized) {
            await electron.window.unmaximize();
        } else await electron.window.maximize();
    };

    return (
        <TitleBarButton
            icon={isMaximized ? IconRestore : IconMaximize}
            onClick={toggleMaximize}
        />
    );
}

function TitleBarButtonMinimize() {
    return (
        <TitleBarButton
            icon={IconMinimize}
            onClick={() => electron.window.minimize()}
        />
    );
}

export default function TitleBar() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [title, setTitle] = useState("");

    useEffect(() => {
        (async () => {
            setIsFullscreen(await electron.window.isFullscreen());
            setTitle(await electron.window.getTitle());
        })();

        const updateTitle = async () => {
            setTitle(await electron.window.getTitle());
        };

        const onFocus = () => setIsWindowFocused(true);
        const onBlur = () => setIsWindowFocused(false);

        const cleanupFullscreen =
            electron.window.onFullscreenChange(setIsFullscreen);
        const cleanupTitle = electron.window.onTitleChanged(updateTitle);
        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);

        return () => {
            cleanupFullscreen();
            cleanupTitle();
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
        };
    }, []);

    if (isFullscreen) return null;

    return (
        <div className="drag flex h-8 w-full flex-row items-center justify-between gap-4 bg-linear-to-t transition duration-300 ease-out">
            <div className="flex h-full flex-1 flex-row items-center justify-start">
                <Logo className="ml-4 w-34 opacity-30" />
            </div>
            <span
                className={twMerge(
                    clsx(
                        "hidden h-full w-full flex-1 items-center justify-center truncate text-sm opacity-50 md:flex",
                        !isWindowFocused && "text-white/50",
                    ),
                )}>
                {title}
            </span>
            <div
                className={twMerge(
                    clsx(
                        "flex h-full flex-1 flex-row items-center justify-end",
                        !isWindowFocused && "text-white/50",
                    ),
                )}>
                <TitleBarButtonMinimize />
                <TitleBarButtonMaximize />
                <TitleBarButtonClose />
            </div>
        </div>
    );
}
