import type { IconElement } from "@renderer/types/iconElement";

import clsx from "clsx";
import { twMerge } from "tailwind-merge";

export interface SideBarItem {
    id: string;
    label: string;
    icon?: IconElement;
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
    const Icon = item.icon;
    return (
        <button
            onClick={onClick}
            className={twMerge(
                clsx(
                    "flex items-center gap-2 rounded-md px-3 py-1 text-sm",
                    isActive
                        ? "bg-black/10 dark:bg-white/10"
                        : "text-neutral-500 hover:bg-black/2 dark:text-neutral-400 dark:hover:bg-white/2",
                ),
            )}>
            {Icon && <Icon className="size-4" />}
            <span>{item.label}</span>
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
                    "no-drag flex h-full w-64 flex-col gap-1.5 p-2",
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
