import type { Tab } from "@renderer/lib/types/tabs";
import type { DragEvent, MouseEvent } from "react";

import { useTabsStore } from "@renderer/lib/state/tabsStore";
import { useHotkey } from "@tanstack/react-hotkeys";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";

import IconPlus from "~icons/fluent/add-16-regular";
import IconX from "~icons/fluent/dismiss-16-regular";

interface TabProps {
    tab: Tab;
    isActive: boolean;
    showClose: boolean;
    onActivate: () => void;
    onClose: () => void;
    onDragStart?: (event: DragEvent) => void;
    onDragOver?: (event: DragEvent) => void;
    onDrop?: (event: DragEvent) => void;
    onDragEnd?: () => void;
}

function TabComponent({
    tab,
    isActive,
    showClose,
    onActivate,
    onClose,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
}: TabProps) {
    function handleClick(event: MouseEvent) {
        if (event.button === 0) onActivate();
    }

    function handleAuxClick(event: MouseEvent) {
        if (event.button === 1) {
            event.preventDefault();
            onClose();
        }
    }

    function handleCloseClick(event: MouseEvent) {
        event.stopPropagation();
        onClose();
    }

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onClick={handleClick}
            onAuxClick={handleAuxClick}
            className={clsx(
                "group flex h-full flex-1 items-center justify-between rounded-md border pr-2 pl-3 text-sm select-none",
                isActive
                    ? "border-transparent bg-black/10 text-neutral-800 dark:bg-white/10 dark:text-neutral-200"
                    : "border-black/10 text-neutral-500 hover:bg-black/5 hover:text-neutral-800 dark:border-white/5 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200",
            )}>
            <div className="pointer-events-none mr-3 flex flex-1 items-center justify-start gap-2 overflow-hidden">
                {tab.icon && (
                    <span className="size-4 shrink-0">{tab.icon}</span>
                )}
                <span className="-translate-y-px truncate">{tab.title}</span>
            </div>
            {showClose && (
                <button
                    tabIndex={-1}
                    onClick={handleCloseClick}
                    className={clsx(
                        "flex size-4.5 shrink-0 items-center justify-center rounded p-0.5 opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5",
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
    const { tabs, activeId, setActiveTab, removeTab, moveTab } = useTabsStore();
    const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
    const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
    const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return undefined;

        // vertical scroll converts into horizontal scrolling
        function handleWheel(event: WheelEvent) {
            if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.preventDefault();
                if (scrollRef.current)
                    scrollRef.current.scrollLeft += event.deltaY;
            }
        }

        container.addEventListener("wheel", handleWheel);

        return () => {
            container.removeEventListener("wheel", handleWheel);
        };
    }, []);

    useEffect(() => {
        if (!activeId) return;
        const activeTabElement = tabRefs.current.get(activeId);
        if (activeTabElement) {
            activeTabElement.scrollIntoView({
                behavior: "smooth",
                inline: "nearest",
                block: "nearest",
            });
        }
    }, [activeId]);

    useHotkey("Mod+W", () => {
        if (activeId) removeTab(activeId);
    });

    useHotkey("Mod+Tab", () => {
        if (tabs.length === 0) return;
        const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
    });

    useHotkey("Mod+Shift+Tab", () => {
        if (tabs.length === 0) return;
        const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
        const prevIndex =
            currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        setActiveTab(tabs[prevIndex].id);
    });

    function handleDragStart(event: DragEvent, tabId: string, index: number) {
        setDraggingTabId(tabId);
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(index));
    }

    function handleDragOver(event: DragEvent, index: number) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        if (
            draggingTabId &&
            tabs.findIndex((tab) => tab.id === draggingTabId) !== index
        ) {
            setDropTargetIndex(index);
        }
    }

    function handleDrop(event: DragEvent, dropIndex: number) {
        event.preventDefault();
        const fromIndex = Number.parseInt(
            event.dataTransfer.getData("text/plain"),
            10,
        );

        if (!Number.isNaN(fromIndex) && fromIndex !== dropIndex)
            moveTab(fromIndex, dropIndex);

        setDraggingTabId(null);
        setDropTargetIndex(null);
    }

    function handleDragEnd() {
        setDraggingTabId(null);
        setDropTargetIndex(null);
    }

    return (
        <div className="flex h-full flex-1 overflow-hidden">
            <div
                ref={scrollRef}
                className="flex h-full flex-1 scroll-px-6 items-center justify-start gap-1 overflow-x-auto p-1.5"
                style={{
                    WebkitMaskImage:
                        "linear-gradient(to right, black calc(100% - 24px), transparent)",
                }}>
                <div className="no-drag flex h-full items-center justify-start gap-1">
                    {tabs.map((tab, index) => (
                        <div
                            key={tab.id}
                            ref={(element) => {
                                if (element)
                                    tabRefs.current.set(tab.id, element);
                            }}
                            className="flex h-full items-center">
                            {dropTargetIndex === index && draggingTabId && (
                                <div className="bg-accent-500 absolute h-[50%] w-0.5 shrink-0 -translate-x-0.75 rounded-full" />
                            )}
                            <TabComponent
                                tab={tab}
                                isActive={tab.id === activeId}
                                showClose={tabs.length > 1}
                                onActivate={() => setActiveTab(tab.id)}
                                onClose={() => removeTab(tab.id)}
                                onDragStart={(event) => {
                                    handleDragStart(event, tab.id, index);
                                }}
                                onDragOver={(event) => {
                                    handleDragOver(event, index);
                                }}
                                onDrop={(event) => {
                                    handleDrop(event, index);
                                }}
                                onDragEnd={handleDragEnd}
                            />
                        </div>
                    ))}
                    <button
                        tabIndex={-1}
                        onMouseDown={(e) => e.preventDefault()}
                        className="flex aspect-square h-full shrink-0 items-center justify-center rounded-md border-black/10 text-neutral-500 hover:border hover:bg-black/5 hover:text-neutral-800 dark:border-white/5 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200">
                        <IconPlus className="size-4" />
                    </button>
                    <div className="h-full w-2" />
                </div>
            </div>
        </div>
    );
}
