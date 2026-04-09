import { useSettingsStore } from "@renderer/lib/settings/settingsStore";
import {
    HIDE_DELAY_MS,
    useTitleBarStore,
} from "@renderer/lib/titlebar/titlebarStore";
import { DEFAULT_SETTINGS } from "@shared/schema/settings";
import { useCallback, useEffect, useRef, useState } from "react";

const ANIMATION_DURATION_MS = 300;
const SPACING_TITLEBAR_HEIGHT = "--spacing-titlebar-height";

const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;

export function useTitleBar(isFullscreen: boolean) {
    const [isActive, setIsActive] = useState(false);
    const isLocked = useTitleBarStore((state) => state.isVisible);
    const autoHideTitleBar = useSettingsStore(
        (state) =>
            state.settings?.appearance.autoHideTitleBar ??
            DEFAULT_SETTINGS.appearance.autoHideTitleBar,
    );
    const [fullHeight, setFullHeight] = useState(40);
    const shouldAutoHide = isFullscreen && autoHideTitleBar;

    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationRef = useRef<number | null>(null);
    const isMouseOverRef = useRef(false);
    const animationStateRef = useRef({
        startTime: 0,
        startHeight: 0,
        targetHeight: 0,
    });

    const prevShouldAutoHideRef = useRef(shouldAutoHide);
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

        if (shouldAutoHide) {
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
    }, [shouldAutoHide, isActive, fullHeight, clearHideTimer, startHideTimer]);

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
        const wasAutoHide = prevShouldAutoHideRef.current;
        const wasLocked = prevLockedRef.current;
        const didEnableAutoHide = shouldAutoHide && !wasAutoHide;
        const didDisableAutoHide = !shouldAutoHide && wasAutoHide;
        const didLockWhileAutoHide = shouldAutoHide && isLocked && !wasLocked;
        const didUnlockWhileAutoHide = shouldAutoHide && !isLocked && wasLocked;

        if (didEnableAutoHide || didLockWhileAutoHide) {
            queueMicrotask(activate);
        } else if (didDisableAutoHide) {
            queueMicrotask(() => setIsActive(false));
        } else if (didUnlockWhileAutoHide) {
            queueMicrotask(deactivate);
        }

        prevShouldAutoHideRef.current = shouldAutoHide;
        prevLockedRef.current = isLocked;
    }, [shouldAutoHide, isLocked, activate, deactivate]);

    const handleMouseEnter = useCallback(() => {
        isMouseOverRef.current = true;
        if (shouldAutoHide) setIsActive(true);
        clearHideTimer();
    }, [shouldAutoHide, clearHideTimer]);

    const handleMouseLeave = useCallback(() => {
        isMouseOverRef.current = false;
        if (shouldAutoHide && isActive && !isLocked) startHideTimer();
    }, [shouldAutoHide, isActive, isLocked, startHideTimer]);

    return {
        isVisible: !shouldAutoHide || isActive,
        showFullscreenTrigger: shouldAutoHide,
        fullHeight,
        handleMouseEnter,
        handleMouseLeave,
    };
}
