import {
    HIDE_DELAY_MS,
    useTitleBarStore,
} from "@renderer/lib/state/titlebarStore";
import { useCallback, useEffect, useRef, useState } from "react";

const ANIMATION_DURATION_MS = 300;
const SPACING_TITLEBAR_HEIGHT = "--spacing-titlebar-height";

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export function useTitleBar(isFullscreen: boolean) {
    const [isActive, setIsActive] = useState(false);
    const isLocked = useTitleBarStore((state) => state.isVisible);
    const [fullHeight, setFullHeight] = useState(40);

    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationRef = useRef<number | null>(null);
    const isMouseOverRef = useRef(false);
    const animationStateRef = useRef({
        startTime: 0,
        startHeight: 0,
        targetHeight: 0,
    });

    const prevFullscreenRef = useRef(isFullscreen);
    const prevLockedRef = useRef(isLocked);

    useEffect(() => {
        let mounted = true;

        const rootElement = document.documentElement;
        const rootComputedStyle = getComputedStyle(rootElement);
        const heightValue = rootComputedStyle.getPropertyValue(
            SPACING_TITLEBAR_HEIGHT,
        );

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

    const clearHideTimer = useCallback(() => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
            hideTimerRef.current = null;
        }
    }, []);

    const startHideTimer = useCallback(() => {
        clearHideTimer();
        hideTimerRef.current = setTimeout(() => {
            setIsActive(false);
        }, HIDE_DELAY_MS);
    }, [clearHideTimer]);

    useEffect(() => {
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
                SPACING_TITLEBAR_HEIGHT,
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

            const currentHeight = Number.parseFloat(
                document.documentElement.style.getPropertyValue(
                    SPACING_TITLEBAR_HEIGHT,
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
    }, [isFullscreen, isActive, fullHeight, clearHideTimer, startHideTimer]);

    useEffect(() => {
        return () => {
            document.documentElement.style.setProperty(
                SPACING_TITLEBAR_HEIGHT,
                `${fullHeight}px`,
            );

            clearHideTimer();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
        };
    }, [fullHeight, clearHideTimer]);

    const activate = useCallback(() => {
        setIsActive(true);
        clearHideTimer();
    }, [clearHideTimer]);

    const deactivate = useCallback(() => {
        if (!isMouseOverRef.current) startHideTimer();
    }, [startHideTimer]);

    useEffect(() => {
        const wasFullscreen = prevFullscreenRef.current;
        const wasLocked = prevLockedRef.current;
        const enteredFullscreen = isFullscreen && !wasFullscreen;
        const lockedWhileFullscreen = isFullscreen && isLocked && !wasLocked;
        const unlockedWhileFullscreen = isFullscreen && !isLocked && wasLocked;

        if (enteredFullscreen || lockedWhileFullscreen) {
            queueMicrotask(activate);
        } else if (unlockedWhileFullscreen) {
            queueMicrotask(deactivate);
        }

        prevFullscreenRef.current = isFullscreen;
        prevLockedRef.current = isLocked;
    }, [isFullscreen, isLocked, activate, deactivate]);

    const handleMouseEnter = useCallback(() => {
        isMouseOverRef.current = true;
        if (isFullscreen) setIsActive(true);
        clearHideTimer();
    }, [isFullscreen, clearHideTimer]);

    const handleMouseLeave = useCallback(() => {
        isMouseOverRef.current = false;
        if (isFullscreen && isActive && !isLocked) startHideTimer();
    }, [isFullscreen, isActive, isLocked, startHideTimer]);

    return {
        isActive,
        fullHeight,
        handleMouseEnter,
        handleMouseLeave,
    };
}
