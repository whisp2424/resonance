import type { SideBarItem } from "@renderer/components/ui/SideBar";
import type { ComponentType } from "react";

import { AboutSettings } from "@renderer/components/settings/AboutSettings";
import { AppearanceSettings } from "@renderer/components/settings/AppearanceSettings";
import { DevSettings } from "@renderer/components/settings/DevSettings";
import SideBar from "@renderer/components/ui/SideBar";
import { useSetting } from "@renderer/hooks/useSetting";
import { useEffect, useState } from "react";

import IconAppearance from "~icons/lucide/brush";
import IconCode from "~icons/lucide/code";
import IconInfo from "~icons/lucide/info";

const BASE_CATEGORY_COMPONENTS: Record<string, ComponentType> = {
    about: AboutSettings,
    appearance: AppearanceSettings,
};

const BASE_SIDEBAR_CATEGORIES: SideBarItem[] = [
    { id: "about", label: "About", icon: IconInfo },
    { id: "appearance", label: "Appearance", icon: IconAppearance },
];

export default function SettingsView() {
    const [isDev, setIsDev] = useState(false);
    const [storedCategory, setActiveCategory] = useSetting("lastCategory");

    useEffect(() => {
        electron.invoke("app:isDev").then(setIsDev);
    }, []);

    const categoryComponents = isDev
        ? { ...BASE_CATEGORY_COMPONENTS, dev: DevSettings }
        : BASE_CATEGORY_COMPONENTS;

    const sidebarCategories = isDev
        ? [
              ...BASE_SIDEBAR_CATEGORIES,
              { id: "dev", label: "Developer", icon: IconCode },
          ]
        : BASE_SIDEBAR_CATEGORIES;

    const defaultCategory = sidebarCategories[0].id;
    const activeCategory =
        storedCategory && storedCategory in categoryComponents
            ? storedCategory
            : defaultCategory;

    const ActiveComponent = categoryComponents[activeCategory];

    return (
        <div className="flex h-full">
            <SideBar
                items={sidebarCategories}
                activeItemId={activeCategory}
                onActiveItemChange={setActiveCategory}
                className="z-60 border-r border-neutral-300 bg-black/4 bg-linear-to-b p-4 dark:border-neutral-800 dark:bg-white/2"
            />
            {ActiveComponent && <ActiveComponent />}
        </div>
    );
}
