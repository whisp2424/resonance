import TabsContainer from "@renderer/components/layout/TabsContainer";
import { useShortcut } from "@renderer/hooks/useShortcut";
import { useWindowState } from "@renderer/hooks/useWindowState";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { WindowControls } from "./WindowControls";
import { useTitlebarAnimation } from "./useTitlebarAnimation";

export default function TitleBar() {
    const { windowId, isFullscreen, isMaximized, isWindowFocused, controls } =
        useWindowState();

    const {
        isActive,
        fullHeight,
        handleMouseEnter,
        handleMouseLeave,
        handleMouseMove,
        triggerVisibility,
    } = useTitlebarAnimation(isFullscreen);

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
                    "drag fixed z-50 flex w-full flex-row items-center justify-end",
                    "bg-neutral-50/50 bg-linear-to-t backdrop-blur-md",
                    "transition-transform duration-300 ease-out",
                    "dark:bg-neutral-900/50",
                    isFullscreen && !isActive && "-translate-y-full",
                )}
                style={{ height: `${fullHeight}px` }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}>
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
                        <WindowControls
                            windowId={windowId}
                            isMaximized={isMaximized}
                            controls={controls}
                        />
                    </div>
                )}
            </div>
            {isFullscreen && (
                <div
                    onMouseEnter={handleMouseEnter}
                    className={clsx(
                        "fixed top-0 left-0 z-100 h-1 w-full",
                        isActive && "pointer-events-none",
                    )}
                />
            )}
        </>
    );
}
