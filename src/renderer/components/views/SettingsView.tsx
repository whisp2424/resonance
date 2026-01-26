import type { SideBarItem } from "@renderer/components/ui/SideBar";
import type { ComponentType, ReactNode } from "react";

import Logo from "@renderer/assets/resonance-logo.svg?react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import SideBar from "@renderer/components/ui/SideBar";
import { useSettings } from "@renderer/hooks/useSettings";
import { useState } from "react";

import IconAppearance from "~icons/lucide/brush";
import IconInfo from "~icons/lucide/info";

interface SettingsCategoryViewProps {
    title: string;
    children: ReactNode;
}

function SettingsCategoryView({ title, children }: SettingsCategoryViewProps) {
    return (
        <div className="flex flex-1 flex-col gap-6 overflow-y-scroll px-10 pt-(--spacing-titlebar-height)">
            <h1 className="text-4xl font-light">{title}</h1>
            <div className="flex-col">{children}</div>
        </div>
    );
}

function AboutSettings() {
    return (
        <div className="m-auto flex flex-1 flex-col items-center justify-center gap-4 px-12 text-center">
            <Logo className="w-80" />
            <div className="flex items-center gap-2 text-sm opacity-50">
                <span>{APP_VERSION}</span>
                <span className="opacity-50">&bull;</span>
                <a
                    href="https://github.com/whispmoe/resonance"
                    target="_blank"
                    rel="noreferrer">
                    github
                </a>
            </div>
        </div>
    );
}

function AppearanceSettings() {
    const themeSelectItems = [
        { label: "System", value: "system" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
    ];

    const [settings, updateSettings] = useSettings();

    return (
        <SettingsCategoryView title="Appearance">
            <div className="flex flex-row items-center justify-between gap-8">
                <div>
                    <h2>App theme</h2>
                    <p className="text-sm opacity-50">
                        Toggle between light and dark theme
                    </p>
                </div>
                {settings && (
                    <Select
                        items={themeSelectItems}
                        defaultValue={settings.appearance.appTheme}
                        onValueChange={(newValue) => {
                            if (newValue) {
                                updateSettings({
                                    appearance: {
                                        ...settings.appearance,
                                        appTheme: newValue,
                                    },
                                });
                            }
                        }}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                            {themeSelectItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </SettingsCategoryView>
    );
}

const CATEGORY_COMPONENTS: Record<string, ComponentType> = {
    about: AboutSettings,
    appearance: AppearanceSettings,
};

const SIDEBAR_CATEGORIES: SideBarItem[] = [
    { id: "about", label: "About", icon: IconInfo },
    { id: "appearance", label: "Appearance", icon: IconAppearance },
];

export default function SettingsView() {
    const [activeCategory, setActiveCategory] = useState("about");
    const ActiveComponent = CATEGORY_COMPONENTS[activeCategory];

    return (
        <div className="flex h-full">
            <SideBar
                items={SIDEBAR_CATEGORIES}
                activeItemId={activeCategory}
                onActiveItemChange={setActiveCategory}
                className="z-60 border-r border-neutral-300 bg-black/4 bg-linear-to-b p-4 dark:border-neutral-800 dark:bg-white/2"
            />
            <ActiveComponent />
        </div>
    );
}
