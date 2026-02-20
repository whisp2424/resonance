import type { TabDescriptor } from "@shared/types/tabs";
import type { MouseEvent } from "react";

import { tabTypeRegistry } from "@renderer/lib/tabRegistry";
import { clsx } from "clsx";

import IconX from "~icons/fluent/dismiss-16-regular";

interface TabContentProps {
    tab: TabDescriptor;
    showClose: boolean | "always";
    onClose?: (event: MouseEvent) => void;
}

export default function TabContent({
    tab,
    showClose,
    onClose,
}: TabContentProps) {
    const config = tabTypeRegistry[tab.type];
    if (!config) return null;

    const Icon = config.icon;

    return (
        <>
            <div className="pointer-events-none mr-3 flex flex-1 items-center justify-start gap-2 overflow-hidden">
                {Icon && <Icon className="size-4 shrink-0" />}
                <span className="-translate-y-px truncate">{tab.title}</span>
            </div>
            {showClose !== false && (
                <button
                    tabIndex={-1}
                    onClick={onClose}
                    className={clsx(
                        "flex size-4.5 shrink-0 items-center justify-center rounded p-0.5",
                        showClose === "always"
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5",
                    )}>
                    <IconX className="size-full" />
                </button>
            )}
        </>
    );
}
