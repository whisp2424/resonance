import TabsContainer from "@renderer/components/layout/tabs/TabsContainer";
import { WindowControls } from "@renderer/components/layout/titlebar/WindowControls";
import { useTitleBar } from "@renderer/components/layout/titlebar/useTitleBar";
import { useWindowState } from "@renderer/hooks/useWindowState";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export default function TitleBar() {
    const { windowId, isFullscreen, isMaximized, isWindowFocused, controls } =
        useWindowState();

    const { isActive, fullHeight, handleMouseEnter, handleMouseLeave } =
        useTitleBar(isFullscreen);

    return (
        <>
            <div
                className={clsx(
                    "drag fixed z-50 flex w-full flex-row items-center justify-end transition-transform duration-300 ease-out",
                    isFullscreen && !isActive && "-translate-y-full",
                )}
                style={{ height: `${fullHeight}px` }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}>
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
