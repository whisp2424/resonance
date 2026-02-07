import type { Tab } from "@renderer/types/tabs";

import { useTabsStore } from "@renderer/state/tabsStore";
import { clsx } from "clsx";
import { useEffect, useRef } from "react";

import IconPlus from "~icons/fluent/add-16-regular";
import IconX from "~icons/fluent/dismiss-16-regular";

interface TabProps {
    tab: Tab;
    isActive: boolean;
    onActivate: () => void;
    onClose: () => void;
}

function TabComponent({ tab, isActive, onActivate, onClose }: TabProps) {
    function handleClick(event: React.MouseEvent) {
        if (event.button === 0) onActivate();
    }

    function handleAuxClick(event: React.MouseEvent) {
        if (event.button === 1) {
            event.preventDefault();
            onClose();
        }
    }

    function handleCloseClick(event: React.MouseEvent) {
        event.stopPropagation();
        onClose();
    }

    const Icon = tab.icon;

    return (
        <div
            onClick={handleClick}
            onAuxClick={handleAuxClick}
            className={clsx(
                "no-drag group flex h-full max-w-52 min-w-36 flex-1 items-center justify-between rounded-md px-3 text-sm select-none",
                isActive
                    ? "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                    : "bg-neutral-200/30 text-neutral-500 duration-300 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200",
            )}>
            <div className="mr-3 flex flex-1 items-center justify-start gap-2 overflow-hidden">
                {Icon && <Icon className="shrink-0" />}
                <span className="truncate">{tab.title}</span>
            </div>
            {tab.closable && (
                <button
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleCloseClick}
                    className={clsx(
                        "flex size-4.5 shrink-0 items-center justify-center rounded p-0.5 opacity-0 duration-300 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5",
                        isActive && "opacity-100",
                    )}>
                    <IconX className="size-full" />
                </button>
            )}
        </div>
    );
}

export default function TabsContainer() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const { tabs, activeTabId, setActiveTab, removeTab } = useTabsStore();

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return undefined;

        function handleWheel(event: WheelEvent) {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.preventDefault();
                if (scrollRef.current)
                    scrollRef.current.scrollLeft += event.deltaY;
            }
        }

        container.addEventListener("wheel", handleWheel, {
            passive: false,
        });

        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, []);

    return (
        <div className="flex h-full flex-1 overflow-hidden">
            <div
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                ref={scrollRef}
                className="flex h-full flex-1 items-center justify-start gap-1 overflow-x-auto p-1.5"
                style={{
                    WebkitMaskImage:
                        "linear-gradient(to right, black calc(100% - 24px), transparent)",
                }}>
                {tabs.map((tab) => (
                    <TabComponent
                        key={tab.id}
                        tab={tab}
                        isActive={tab.id === activeTabId}
                        onActivate={() => setActiveTab(tab.id)}
                        onClose={() => removeTab(tab.id)}
                    />
                ))}
                <button
                    tabIndex={-1}
                    onMouseDown={(e) => e.preventDefault()}
                    className="no-drag flex h-full w-8 shrink-0 items-center justify-center rounded-md bg-neutral-200/30 text-neutral-500 duration-300 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200">
                    <IconPlus className="size-4" />
                </button>
            </div>
        </div>
    );
}
