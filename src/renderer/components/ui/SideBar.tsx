import type { ReactNode } from "react";

import clsx from "clsx";
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
        <button
            onClick={onClick}
            className={twMerge(
                clsx(
                    "my-0.5 flex items-center gap-2",
                    "rounded-md px-3 py-1 text-sm",
                    isActive
                        ? "bg-black/10 dark:bg-white/10"
                        : "text-neutral-600 hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/5",
                ),
            )}>
            {item.icon && <span className="size-4 shrink-0">{item.icon}</span>}
            <span className="truncate">{item.label}</span>
        </button>
    );
}

export default function SideBar({
    className,
    items,
    activeItemId,
    onActiveItemChange,
}: SideBarProps) {
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
                    onClick={() => onActiveItemChange?.(item.id)}
                />
            ))}
        </div>
    );
}
