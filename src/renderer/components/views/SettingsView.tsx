import type { SideBarItem } from "@renderer/components/ui/SideBar";
import type { ComponentType } from "react";

import { AboutSettings } from "@renderer/components/settings/AboutSettings";
import { AppearanceSettings } from "@renderer/components/settings/AppearanceSettings";
import SideBar from "@renderer/components/ui/SideBar";
import { useState } from "react";

import IconAppearance from "~icons/lucide/brush";
import IconInfo from "~icons/lucide/info";

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
            {ActiveComponent && <ActiveComponent />}
        </div>
    );
}
