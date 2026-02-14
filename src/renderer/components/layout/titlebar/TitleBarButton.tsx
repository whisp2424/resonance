import type { ButtonHTMLAttributes, ReactNode } from "react";

import { clsx } from "clsx";
import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface TitleBarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
}

export const TitleBarButton = memo(function TitleBarButton({
    icon,
    className,
    onClick,
}: TitleBarButtonProps) {
    return (
        <button
            tabIndex={-1}
            onMouseDown={(e) => e.preventDefault()}
            className={twMerge(
                clsx(
                    "no-drag flex h-full w-12 items-center justify-center transition duration-250 hover:bg-black/10 hover:duration-0 dark:hover:bg-white/10",
                    className,
                ),
            )}
            onClick={onClick}>
            <span className="size-4 scale-105">{icon}</span>
        </button>
    );
});
