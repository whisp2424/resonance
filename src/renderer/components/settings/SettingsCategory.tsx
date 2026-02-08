import type { ReactNode } from "react";

interface SettingsCategoryProps {
    title: string;
    children: ReactNode;
}

export function SettingsCategory({ title, children }: SettingsCategoryProps) {
    return (
        <div className="flex w-xl max-w-[90%] flex-col gap-6 overflow-y-scroll px-0.5 pt-[calc(var(--spacing-titlebar-height)+1.5rem)] pb-8">
            <h1 className="text-4xl font-light">{title}</h1>
            <div className="mt-2 flex flex-1 flex-col gap-6">{children}</div>
        </div>
    );
}
