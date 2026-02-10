import type { IconElement } from "@renderer/types/iconElement";
import type { ButtonHTMLAttributes } from "react";

import { clsx } from "clsx";
import { memo } from "react";
import { twMerge } from "tailwind-merge";

interface TitleBarButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: IconElement;
}

export const TitleBarButton = memo(function TitleBarButton({
    icon: Icon,
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
            <Icon className="size-4 scale-105" />
        </button>
    );
});
