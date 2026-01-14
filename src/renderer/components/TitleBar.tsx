import type { ButtonHTMLAttributes } from "react";
import type { IconElement } from "@/types/iconElement";

import { clsx } from "clsx";
import { useEffect, useState } from "react";

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
                "no-drag flex h-full w-12 items-center justify-center transition duration-250 hover:bg-neutral-900 hover:duration-0",
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
            onClick={() => window.electronAPI.closeWindow()}
        />
    );
}

function TitleBarButtonMaximize() {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        (async () => {
            setIsMaximized(await window.electronAPI.isWindowMaximized());
        })();

        const updateMaximized = async () => {
            setIsMaximized(await window.electronAPI.isWindowMaximized());
        };

        window.electronAPI.onWindowMaximize(updateMaximized);

        return () => {
            window.electronAPI.removeListeners("maximize");
            window.electronAPI.removeListeners("unmaximize");
        };
    }, []);

    const toggleMaximize = async () => {
        const maximized = await window.electronAPI.isWindowMaximized();

        if (maximized) {
            await window.electronAPI.unmaximizeWindow();
        } else await window.electronAPI.maximizeWindow();
        setIsMaximized(!maximized);
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
            onClick={() => window.electronAPI.minimizeWindow()}
        />
    );
}

export default function TitleBar() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);

    useEffect(() => {
        (async () => {
            setIsFullscreen(await window.electronAPI.isWindowFullscreen());
        })();

        const updateFullscreen = async () => {
            setIsFullscreen(await window.electronAPI.isWindowFullscreen());
        };

        const onFocus = () => setIsWindowFocused(true);
        const onBlur = () => setIsWindowFocused(false);

        window.electronAPI.onWindowFullscreen(updateFullscreen);
        window.addEventListener("focus", onFocus);
        window.addEventListener("blur", onBlur);

        return () => {
            window.electronAPI.removeListeners("enter-full-screen");
            window.electronAPI.removeListeners("leave-full-screen");
            window.removeEventListener("focus", onFocus);
            window.removeEventListener("blur", onBlur);
        };
    }, []);

    if (isFullscreen) return null;

    return (
        <div className="drag flex h-8 w-full flex-row items-center justify-between">
            <div className="flex h-full flex-row items-center justify-start px-4">
                <Logo className="w-34 opacity-20" />
            </div>
            <div
                className={clsx(
                    "flex h-full flex-row items-center justify-start transition duration-200",
                    !isWindowFocused && "opacity-50",
                )}>
                <TitleBarButtonMinimize />
                <TitleBarButtonMaximize />
                <TitleBarButtonClose />
            </div>
        </div>
    );
}
