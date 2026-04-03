import type { ReactNode } from "react";

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

interface SettingsRowProps {
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    layout?: "inline" | "stacked";
    className?: string;
    contentClassName?: string;
}

export function SettingsRow({
    title,
    description,
    children,
    layout = "inline",
    className,
    contentClassName,
}: SettingsRowProps) {
    return (
        <div
            className={twMerge(
                clsx(
                    "gap-8",
                    layout === "inline"
                        ? "flex flex-row items-center justify-between"
                        : "flex flex-col gap-3",
                ),
                className,
            )}>
            <div className={twMerge("flex flex-col", contentClassName)}>
                <div>{title}</div>
                {description && (
                    <p className="text-sm opacity-50">{description}</p>
                )}
            </div>
            {children}
        </div>
    );
}
