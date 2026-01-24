import type { SideBarItem } from "@renderer/components/ui/SideBar";
import type { ComponentType } from "react";

import Logo from "@renderer/assets/resonance-logo.svg?react";
import SideBar from "@renderer/components/ui/SideBar";
import { useState } from "react";

import IconAppearance from "~icons/lucide/brush";
import IconInfo from "~icons/lucide/info";

function AboutSettings() {
    return (
        <div className="m-auto flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
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
    return (
        <div className="flex flex-1 flex-col gap-4 p-6">
            <h1 className="text-2xl font-semibold">Appearance</h1>
            <p className="text-neutral-600 dark:text-neutral-400">
                Customize the look and feel of the application.
            </p>
        </div>
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
                className="border-r border-neutral-300 bg-black/4 bg-linear-to-b p-4 dark:border-neutral-800 dark:bg-white/2"
            />
            <ActiveComponent />
        </div>
    );
}
