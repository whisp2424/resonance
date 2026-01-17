import type { IconElement } from "@renderer/types/iconElement";
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

function TitleBarButtonClose() {
    return (
        <TitleBarButton
            icon={IconX}
            className="hover:bg-red-500"
            onClick={() => electron.invoke("window:close")}
        />
    );
}

function TitleBarButtonMaximize() {
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        (async () => {
            setIsMaximized(await electron.invoke("window:isMaximized"));
        })();

        const updateMaximized = async () =>
            setIsMaximized(await electron.invoke("window:isMaximized"));

        const cleanup = electron.send("window:onMaximize", updateMaximized);
        electron.send("window:onUnmaximize", updateMaximized);

        return cleanup;
    }, []);

    const toggleMaximize = async () => {
        const maximized = await electron.invoke("window:isMaximized");

        if (maximized) {
            await electron.invoke("window:unmaximize");
        } else await electron.invoke("window:maximize");
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
            onClick={() => electron.invoke("window:minimize")}
        />
    );
}

export default function TitleBar() {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isWindowFocused, setIsWindowFocused] = useState(true);
    const [title, setTitle] = useState("");

    useEffect(() => {
        (async () => {
            setIsFullscreen(await electron.invoke("window:isFullscreen"));
            setTitle(await electron.invoke("window:getTitle"));
        })();

        const updateTitle = async () => {
            setTitle(await electron.invoke("window:getTitle"));
        };

        window.addEventListener("focus", () => setIsWindowFocused(true));
        window.addEventListener("blur", () => setIsWindowFocused(false));

        return () => {
            electron.send("window:onEnterFullscreen", () =>
                setIsFullscreen(true),
            )();

            electron.send("window:onLeaveFullscreen", () =>
                setIsFullscreen(false),
            )();

            electron.send("window:onWindowTitleChanged", updateTitle)();
            window.removeEventListener("focus", () => setIsWindowFocused(true));
            window.removeEventListener("blur", () => setIsWindowFocused(false));
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
