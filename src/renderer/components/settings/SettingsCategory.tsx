import type { ReactNode } from "react";

interface SettingsCategoryProps {
    title: string;
    children: ReactNode;
}

export function SettingsCategory({ title, children }: SettingsCategoryProps) {
    return (
        <div className="flex flex-1 flex-col gap-6 overflow-y-scroll px-10 pt-(--spacing-titlebar-height)">
            <h1 className="text-4xl font-light">{title}</h1>
            <div className="flex-col">{children}</div>
        </div>
    );
}
