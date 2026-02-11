import type { IconElement } from "@renderer/types/iconElement";
import type { ButtonHTMLAttributes } from "react";

import TabsContainer from "@renderer/components/layout/TabsContainer";
import { useShortcut } from "@renderer/hooks/useShortcut";
import { useWindowState } from "@renderer/hooks/useWindowState";
import { clsx } from "clsx";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

import IconX from "~icons/fluent/dismiss-16-regular";
import IconMaximize from "~icons/fluent/maximize-16-regular";
import IconMinimize from "~icons/fluent/minimize-16-regular";
import IconRestore from "~icons/fluent/square-multiple-16-regular";

const HIDE_DELAY_MS = 500;
const ANIMATION_DURATION_MS = 300;

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

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
    const { windowId, isFullscreen, isWindowFocused, controls } =
        useWindowState();
    const [isActive, setIsActive] = useState(false);
    const [fullHeight, setFullHeight] = useState(40);

    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationRef = useRef<number | null>(null);
    const animationStateRef = useRef({
        startTime: 0,
        startHeight: 0,
        targetHeight: 0,
    });

    // initialize animation values
    useEffect(() => {
        let mounted = true;

        const rootElement = document.documentElement;
        const rootComputedStyle = getComputedStyle(rootElement);
        const heightValue = rootComputedStyle.getPropertyValue(
            "--spacing-titlebar-height",
        );

        // get titlebar height value in pixels
        const tmp = document.createElement("div");
        tmp.style.height = heightValue;
        tmp.style.position = "absolute";
        tmp.style.visibility = "hidden";
        document.body.appendChild(tmp);
        const pxHeight = tmp.getBoundingClientRect().height;
        document.body.removeChild(tmp);

        queueMicrotask(() => {
            if (mounted) setFullHeight(pxHeight);
        });

        return () => {
            mounted = false;
        };
    }, []);

    // animate titlebar height in fullscreen
    useEffect(() => {
        const clearHideTimer = () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
                hideTimerRef.current = null;
            }
        };

        const startHideTimer = () => {
            clearHideTimer();
            hideTimerRef.current = setTimeout(() => {
                setIsActive(false);
            }, HIDE_DELAY_MS);
        };

        const animateHeight = (timestamp: number) => {
            const state = animationStateRef.current;
            if (!state.startTime) state.startTime = timestamp;

            const elapsed = timestamp - state.startTime;
            const progress = Math.min(elapsed / ANIMATION_DURATION_MS, 1);
            const easedProgress = easeOutCubic(progress);

            const currentHeight =
                state.startHeight +
                (state.targetHeight - state.startHeight) * easedProgress;

            document.documentElement.style.setProperty(
                "--spacing-titlebar-height",
                `${currentHeight}px`,
            );

            if (progress < 1) {
                animationRef.current = requestAnimationFrame(animateHeight);
            } else {
                animationRef.current = null;
                state.startTime = 0;
            }
        };

        const startAnimation = (targetHeight: number) => {
            if (animationRef.current)
                cancelAnimationFrame(animationRef.current);

            // read current height once animation starts
            const currentHeight = Number.parseFloat(
                document.documentElement.style.getPropertyValue(
                    "--spacing-titlebar-height",
                ) || "0",
            );

            const state = animationStateRef.current;
            state.startHeight = currentHeight;
            state.targetHeight = targetHeight;
            state.startTime = 0;

            animationRef.current = requestAnimationFrame(animateHeight);
        };

        if (isFullscreen) {
            if (isActive) {
                startAnimation(fullHeight);
                startHideTimer();
            } else {
                startAnimation(0);
                clearHideTimer();
            }
        } else {
            startAnimation(fullHeight);
            clearHideTimer();
        }

        return () => {
            clearHideTimer();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [isFullscreen, isActive, fullHeight]);

    useEffect(() => {
        return () => {
            document.documentElement.style.setProperty(
                "--spacing-titlebar-height",
                `${fullHeight}px`,
            );

            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            if (animationRef.current)
                cancelAnimationFrame(animationRef.current);
        };
    }, [fullHeight]);

    // event handlers
    const handleTitlebarMouseMove = useCallback(() => {
        if (isFullscreen && isActive && hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = setTimeout(() => {
                setIsActive(false);
            }, HIDE_DELAY_MS);
        }
    }, [isFullscreen, isActive]);

    const handleTriggerEnter = useCallback(() => {
        if (isFullscreen) setIsActive(true);
    }, [isFullscreen]);

    const handleTitlebarLeave = useCallback(() => {
        if (isFullscreen && isActive) {
            hideTimerRef.current = setTimeout(() => {
                setIsActive(false);
            }, HIDE_DELAY_MS);
        }
    }, [isFullscreen, isActive]);

    const handleTitlebarEnter = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    // show titlebar briefly when tabs change
    const triggerVisibility = useCallback(() => {
        if (!isFullscreen) return;

        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }

        if (!isActive) {
            setIsActive(true);
        } else {
            hideTimerRef.current = setTimeout(() => {
                setIsActive(false);
            }, HIDE_DELAY_MS);
        }
    }, [isFullscreen, isActive]);

    useShortcut({ code: "Tab", ctrlOrCmd: true }, triggerVisibility);
    useShortcut(
        { code: "Tab", ctrlOrCmd: true, shift: true },
        triggerVisibility,
    );

    useShortcut({ code: "KeyW", ctrlOrCmd: true }, triggerVisibility);
    useShortcut(
        { code: "KeyT", ctrlOrCmd: true, shift: true },
        triggerVisibility,
    );

    return (
        <>
            <div
                className={clsx(
                    "drag fixed z-50 flex w-full flex-row items-center justify-end transition-transform duration-300 ease-out",
                    isFullscreen && !isActive && "-translate-y-full",
                )}
                style={{ height: `${fullHeight}px` }}
                onMouseEnter={handleTitlebarEnter}
                onMouseLeave={handleTitlebarLeave}
                onMouseMove={handleTitlebarMouseMove}>
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
            {isFullscreen && (
                <div
                    className={clsx(
                        "fixed top-0 left-0 z-100 h-1 w-full",
                        isActive && "pointer-events-none",
                    )}
                    onMouseEnter={handleTriggerEnter}
                />
            )}
        </>
    );
}
