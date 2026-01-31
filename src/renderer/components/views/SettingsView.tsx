import type { SideBarItem } from "@renderer/components/ui/SideBar";
import type { ComponentType } from "react";

import { AboutSettings } from "@renderer/components/settings/AboutSettings";
import { AppearanceSettings } from "@renderer/components/settings/AppearanceSettings";
import { DeveloperSettings } from "@renderer/components/settings/DeveloperSettings";
import { LibrarySettings } from "@renderer/components/settings/LibrarySettings";
import SideBar from "@renderer/components/ui/SideBar";
import { useSetting } from "@renderer/hooks/useSetting";
import { useEffect, useState } from "react";

import IconAppearance from "~icons/lucide/brush";
import IconCode from "~icons/lucide/code";
import IconInfo from "~icons/lucide/info";
import IconLibrary from "~icons/lucide/library-big";

const CATEGORY_COMPONENTS: Record<string, ComponentType> = {
    about: AboutSettings,
    appearance: AppearanceSettings,
    library: LibrarySettings,
};

const SIDEBAR_CATEGORIES: SideBarItem[] = [
    { id: "about", label: "About", icon: IconInfo },
    { id: "appearance", label: "Appearance", icon: IconAppearance },
    { id: "library", label: "Library", icon: IconLibrary },
];

export default function SettingsView() {
    const [isDev, setIsDev] = useState(false);
    const [lastCategory, setLastCategory] = useSetting("lastCategory");

    useEffect(() => {
        electron.invoke("app:isDev").then(setIsDev);
    }, []);

    const categoryComponents = isDev
        ? { ...CATEGORY_COMPONENTS, dev: DeveloperSettings }
        : CATEGORY_COMPONENTS;

    const sidebarCategories = isDev
        ? [
              ...SIDEBAR_CATEGORIES,
              { id: "dev", label: "Developer", icon: IconCode },
          ]
        : SIDEBAR_CATEGORIES;

    const defaultCategory = sidebarCategories[0].id;

    const activeCategory =
        lastCategory && lastCategory in categoryComponents
            ? lastCategory
            : defaultCategory;

    const ActiveComponent = categoryComponents[activeCategory];

    return (
        <div className="flex h-full">
            <SideBar
                items={sidebarCategories}
                activeItemId={activeCategory}
                onActiveItemChange={setLastCategory}
                className="z-60 border-r border-neutral-300 bg-black/4 bg-linear-to-b p-4 dark:border-neutral-800 dark:bg-white/2"
            />
            {ActiveComponent && <ActiveComponent />}
        </div>
    );
}
