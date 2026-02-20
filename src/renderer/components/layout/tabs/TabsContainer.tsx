import type { DragEndEvent, DragStartEvent, Modifier } from "@dnd-kit/core";

import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers";
import {
    SortableContext,
    horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import DraggableTab from "@renderer/components/layout/tabs/DraggableTab";
import TabOverlay from "@renderer/components/layout/tabs/TabOverlay";
import { useTabsStore } from "@renderer/lib/state/tabsStore";
import { useTitleBarStore } from "@renderer/lib/state/titlebarStore";
import { useHotkey } from "@tanstack/react-hotkeys";
import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";

import IconPlus from "~icons/fluent/add-16-regular";

export default function TabsContainer() {
    const scrollRef = useRef<HTMLDivElement>(null);
    const tabsContainerRef = useRef<HTMLDivElement>(null);
    const { tabs, activeId, activateTab, closeTab, moveTab } = useTabsStore();
    const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const { lock, unlock, trigger } = useTitleBarStore();

    const restrictToTabsContainer: Modifier = ({
        transform,
        draggingNodeRect,
    }) => {
        if (!draggingNodeRect || !tabsContainerRef.current) return transform;

        const containerRect = tabsContainerRef.current.getBoundingClientRect();
        const minX = containerRect.left - draggingNodeRect.left;
        const maxX =
            containerRect.right -
            draggingNodeRect.left -
            draggingNodeRect.width;

        return {
            ...transform,
            x: Math.max(minX, Math.min(maxX, transform.x)),
        };
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 4 },
        }),
    );

    // convert vertical wheel events to horizontal scrolling
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

        container.addEventListener("wheel", handleWheel);
        return () => container.removeEventListener("wheel", handleWheel);
    }, []);

    // auto-scroll to keep the active tab visible
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
        if (activeDragId) return;
        if (activeId) closeTab(activeId);
    });

    useHotkey("Mod+Shift+T", () => {
        if (activeDragId) return;
        useTabsStore.getState().restoreLastTab();
    });

    useHotkey("Mod+Tab", () => {
        if (activeDragId) return;
        trigger();
        if (tabs.length === 0) return;
        const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        activateTab(tabs[nextIndex]!.id);
    });

    useHotkey("Mod+Shift+Tab", () => {
        if (activeDragId) return;
        trigger();
        if (tabs.length === 0) return;
        const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
        const prevIndex =
            currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        activateTab(tabs[prevIndex]!.id);
    });

    useHotkey("Mod+,", () => {
        if (activeDragId) return;
        useTabsStore.getState().openTab("settings");
    });

    const activeTab = activeDragId
        ? tabs.find((tab) => tab.id === activeDragId)
        : null;

    function onDragStart(event: DragStartEvent) {
        setActiveDragId(event.active.id.toString());
        lock();
    }

    // reorder tabs when drag completes
    function onDragEnd(event: DragEndEvent) {
        setActiveDragId(null);
        unlock();

        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = tabs.findIndex((tab) => tab.id === active.id);
            const newIndex = tabs.findIndex((tab) => tab.id === over.id);
            if (oldIndex !== -1 && newIndex !== -1) moveTab(oldIndex, newIndex);
        }
    }

    return (
        <div className="flex h-full flex-1 overflow-hidden">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                modifiers={[restrictToHorizontalAxis, restrictToTabsContainer]}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={() => {
                    setActiveDragId(null);
                    unlock();
                }}>
                <div
                    ref={scrollRef}
                    tabIndex={-1}
                    className="flex h-full flex-1 scroll-px-6 items-center justify-start gap-1 overflow-x-auto p-1.5 outline-none"
                    style={{
                        WebkitMaskImage:
                            "linear-gradient(to right, black calc(100% - 24px), transparent)",
                    }}>
                    <SortableContext
                        items={tabs.map((tab) => tab.id)}
                        strategy={horizontalListSortingStrategy}>
                        <div
                            ref={tabsContainerRef}
                            className="no-drag flex h-full items-center justify-start gap-1">
                            {tabs.map((tab) => (
                                <div
                                    key={tab.id}
                                    ref={(element) => {
                                        if (element)
                                            tabRefs.current.set(
                                                tab.id,
                                                element,
                                            );
                                    }}
                                    className="flex h-full items-center">
                                    <DraggableTab
                                        tab={tab}
                                        isActive={tab.id === activeId}
                                        showClose={tabs.length > 1}
                                        isDraggable={tabs.length > 1}
                                        onActivate={() => activateTab(tab.id)}
                                        onClose={() => closeTab(tab.id)}
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            tabIndex={-1}
                            onMouseDown={(e) => e.preventDefault()}
                            className={clsx(
                                "no-drag mr-4 flex aspect-square h-full shrink-0 items-center justify-center rounded-md border-black/10 text-neutral-500 hover:border hover:bg-black/5 hover:text-neutral-800 dark:border-white/5 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200",
                            )}>
                            <IconPlus className="size-4" />
                        </button>
                    </SortableContext>
                </div>
                <DragOverlay>
                    {activeTab && (
                        <TabOverlay
                            tab={activeTab}
                            isActive={activeTab.id === activeId}
                        />
                    )}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
