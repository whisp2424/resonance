import type { IconElement } from "@renderer/types/iconElement";

import { clsx } from "clsx";
import { useEffect, useRef } from "react";

import IconPlus from "~icons/fluent/add-16-regular";
import IconX from "~icons/fluent/dismiss-16-regular";
import IconCog from "~icons/lucide/cog";
import IconLibrary from "~icons/lucide/library-big";

// static mock data for visual display only
const mockTabs = [
    { id: "library", icon: IconLibrary, label: "Library" },
    { id: "settings", icon: IconCog, label: "Settings" },
] as const;

interface TabProps {
    icon: IconElement;
    label: string;
    isActive: boolean;
}

function Tab({ icon: Icon, label, isActive }: TabProps) {
    return (
        <div
            className={clsx(
                "no-drag group flex h-full max-w-52 min-w-36 flex-1 items-center justify-between rounded-md px-3 text-sm select-none",
                isActive
                    ? "bg-neutral-200 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200"
                    : "bg-neutral-200/30 text-neutral-500 duration-300 hover:bg-neutral-200 hover:text-neutral-800 dark:bg-neutral-800/30 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-200",
            )}>
            <div className="mr-3 flex flex-1 items-center justify-start gap-2 overflow-hidden">
                <Icon className="shrink-0" />
                <span className="truncate">{label}</span>
            </div>
            <button
                tabIndex={-1}
                onMouseDown={(e) => e.preventDefault()}
                className={clsx(
                    "flex size-4.5 shrink-0 items-center justify-center rounded p-0.5 opacity-0 duration-300 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5",
                    isActive && "opacity-100",
                )}>
                <IconX className="size-full" />
            </button>
        </div>
    );
}

export default function TabsContainer() {
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return undefined;

        // convert vertical wheel to horizontal scroll
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
                {mockTabs.map((tab) => (
                    <Tab
                        key={tab.id}
                        icon={tab.icon}
                        label={tab.label}
                        isActive={tab.id === "library"}
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
