import type { ReactNode } from "react";

import { twMerge } from "tailwind-merge";

interface SettingsSectionProps {
    title: ReactNode;
    children: ReactNode;
    className?: string;
}

export function SettingsSection({
    title,
    children,
    className,
}: SettingsSectionProps) {
    return (
        <section className={twMerge("flex flex-col gap-4", className)}>
            <h2 className="text-xl font-light opacity-60">{title}</h2>
            {children}
        </section>
    );
}
