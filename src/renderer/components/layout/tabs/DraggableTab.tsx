import type { TabDescriptor } from "@shared/types/tabs";
import type { MouseEvent } from "react";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import TabContent from "@renderer/components/layout/tabs/TabContent";
import { clsx } from "clsx";
import { useEffect } from "react";

interface DraggableTabProps {
    tab: TabDescriptor;
    isActive: boolean;
    showClose: boolean;
    isDraggable: boolean;
    onActivate: () => void;
    onClose: () => void;
}

export default function DraggableTab({
    tab,
    isActive,
    showClose,
    isDraggable,
    onActivate,
    onClose,
}: DraggableTabProps) {
    const { listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: tab.id, disabled: !isDraggable });

    useEffect(() => {
        if (isDragging && !isActive) onActivate();
    }, [isDragging, isActive, onActivate]);

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
    };

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
            ref={setNodeRef}
            style={style}
            {...listeners}
            onClick={handleClick}
            onAuxClick={handleAuxClick}
            className={clsx(
                "group flex h-full flex-1 items-center justify-between rounded-md border pr-2 pl-3 text-sm select-none",
                isDragging && "opacity-0",
                isActive
                    ? "border-transparent bg-black/10 text-neutral-800 dark:bg-white/10 dark:text-neutral-200"
                    : "border-black/10 text-neutral-500 hover:bg-black/5 hover:text-neutral-800 dark:border-white/5 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-200",
            )}>
            <TabContent
                tab={tab}
                showClose={
                    showClose && (isActive || isDragging) ? "always" : showClose
                }
                onClose={handleCloseClick}
            />
        </div>
    );
}
