import type { TabDescriptor } from "@shared/types/tabs";

import TabContent from "@renderer/components/layout/tabs/TabContent";
import { clsx } from "clsx";

interface TabOverlayProps {
    tab: TabDescriptor;
    isActive: boolean;
}

export default function TabOverlay({ tab, isActive }: TabOverlayProps) {
    return (
        <div
            className={clsx(
                "group flex h-full flex-1 items-center justify-between rounded-md border pr-2 pl-3 text-sm select-none",
                isActive
                    ? "border-transparent bg-black/10 text-neutral-800 dark:bg-white/10 dark:text-neutral-200"
                    : "border-black/10 bg-black/10 text-neutral-800 dark:border-white/5 dark:bg-white/10 dark:text-neutral-200",
            )}>
            <TabContent tab={tab} showClose="always" isDragging />
        </div>
    );
}
