import type { ReactNode } from "react";

import clsx from "clsx";
import { useCallback } from "react";
import { twMerge } from "tailwind-merge";

export interface SideBarItem {
    id: string;
    label: string;
    icon?: ReactNode;
}

interface SideBarProps {
    className?: string;
    items: SideBarItem[];
    activeItemId: string;
    onActiveItemChange?: (itemId: string) => void;
}

interface SideBarButtonProps {
    item: SideBarItem;
    isActive: boolean;
    onClick: () => void;
}

function SideBarButton({ item, isActive, onClick }: SideBarButtonProps) {
    return (
        <button onClick={onClick} className="group py-0.5">
            <div
                className={twMerge(
                    clsx(
                        "flex items-center gap-2",
                        "rounded-md px-3 py-1 text-sm",
                        isActive
                            ? "bg-black/10 dark:bg-white/10"
                            : "text-neutral-600 group-hover:bg-black/5 dark:text-neutral-400 dark:group-hover:bg-white/5",
                    ),
                )}>
                {item.icon && (
                    <span className="size-4 shrink-0">{item.icon}</span>
                )}
                <span className="truncate">{item.label}</span>
            </div>
        </button>
    );
}

export default function SideBar({
    className,
    items,
    activeItemId,
    onActiveItemChange,
}: SideBarProps) {
    const handleItemClick = useCallback(
        (itemId: string) => onActiveItemChange?.(itemId),
        [onActiveItemChange],
    );

    return (
        <div
            className={twMerge(
                clsx(
                    "flex w-56 flex-col overflow-y-scroll px-0.5 pb-4",
                    className,
                ),
            )}>
            {items.map((item) => (
                <SideBarButton
                    key={item.id}
                    item={item}
                    isActive={activeItemId === item.id}
                    onClick={() => handleItemClick(item.id)}
                />
            ))}
        </div>
    );
}
