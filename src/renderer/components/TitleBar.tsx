import type { ButtonHTMLAttributes } from "react";
import type { IconElement } from "@/types/iconElement";

import { useEffect, useState } from "react";

import Logo from "@/assets/resonance-logo.svg?react";
import IconX from "~icons/fluent/dismiss-24-regular";
import IconMaximize from "~icons/fluent/maximize-24-regular";
import IconMinimize from "~icons/fluent/minimize-24-regular";
import IconRestore from "~icons/fluent/square-multiple-24-regular";

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
            className={`no-drag flex h-full w-12 items-center justify-center transition duration-250 hover:bg-neutral-950 hover:duration-0 ${className}`}
            {...rest}>
            <Icon className="size-3.5" />
        </button>
    );
}

function TitleBarButtonClose() {
    return (
        <TitleBarButton
            icon={IconX}
            className="hover:bg-red-500"
            onClick={() => window.electron.closeWindow()}
        />
    );
}

function TitleBarButtonMaximize() {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        (async () => {
            setIsMaximized(await window.electron.isWindowMaximized());
        })();

        const updateMaximized = async () => {
            setIsMaximized(await window.electron.isWindowMaximized());
        };

        window.electron.onWindowMaximize(updateMaximized);

        return () => {
            window.electron.removeListeners("maximize");
            window.electron.removeListeners("unmaximize");
        };
    }, []);

    const toggleMaximize = async () => {
        const maximized = await window.electron.isWindowMaximized();

        if (maximized) {
            await window.electron.unmaximizeWindow();
        } else await window.electron.maximizeWindow();
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
            onClick={() => window.electron.minimizeWindow()}
        />
    );
}

export default function TitleBar() {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        (async () => {
            setIsFullscreen(await window.electron.isWindowFullscreen());
        })();

        const updateFullscreen = async () => {
            setIsFullscreen(await window.electron.isWindowFullscreen());
        };

        window.electron.onWindowFullscreen(updateFullscreen);

        return () => {
            window.electron.removeListeners("enter-full-screen");
            window.electron.removeListeners("leave-full-screen");
        };
    }, []);

    if (isFullscreen) {
        return null;
    }

    return (
        <div className="drag flex h-8 w-full flex-row items-center justify-between">
            <div className="flex h-full flex-row items-center justify-start px-4">
                <Logo className="w-34 opacity-20" />
            </div>
            <div className="flex h-full flex-row items-center justify-start">
                <TitleBarButtonMinimize />
                <TitleBarButtonMaximize />
                <TitleBarButtonClose />
            </div>
        </div>
    );
}
