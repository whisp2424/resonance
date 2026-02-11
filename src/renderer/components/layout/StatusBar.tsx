import type { ReactNode } from "react";

import clsx from "clsx";

interface StatusBarProps {
    className?: string;
    children?: ReactNode;
}

export default function StatusBar({ className, children }: StatusBarProps) {
    return (
        <div
            className={clsx(
                "flex h-7 items-center justify-between border-t border-neutral-300 px-3 text-xs text-neutral-600 dark:border-neutral-800 dark:text-neutral-400",
                className,
            )}>
            {children}
        </div>
    );
}
