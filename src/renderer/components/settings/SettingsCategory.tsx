import type { ReactNode } from "react";

import { twMerge } from "tailwind-merge";

interface SettingsCategoryProps {
    title: string;
    children: ReactNode;
    className?: string;
}

export function SettingsCategory({
    title,
    children,
    className,
}: SettingsCategoryProps) {
    return (
        <div className="flex w-xl max-w-[90%] flex-col gap-6 overflow-y-auto px-2 pt-[calc(var(--spacing-titlebar-height)+2rem)] pb-8">
            <h1 className="text-4xl font-light">{title}</h1>
            <div
                className={twMerge(
                    "mt-2 flex flex-1 flex-col gap-6",
                    className,
                )}>
                {children}
            </div>
        </div>
    );
}
