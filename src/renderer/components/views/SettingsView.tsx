import type { SideBarItem } from "@renderer/components/ui/SideBar";
import type { ComponentType } from "react";

import { AppearanceSettings } from "@renderer/components/settings/AppearanceSettings";
import { DeveloperSettings } from "@renderer/components/settings/DeveloperSettings";
import { LibrarySettings } from "@renderer/components/settings/LibrarySettings";
import SideBar from "@renderer/components/ui/SideBar";
import { useSetting } from "@renderer/hooks/settings/useSetting";
import { useSettingsStore } from "@renderer/state/settingsStore";
import { useEffect, useState } from "react";

import IconAppearance from "~icons/lucide/brush";
import IconCode from "~icons/lucide/code";
import IconLibrary from "~icons/lucide/library-big";

const CATEGORY_COMPONENTS: Record<string, ComponentType> = {
    appearance: AppearanceSettings,
    library: LibrarySettings,
};

const SIDEBAR_CATEGORIES: SideBarItem[] = [
    { id: "appearance", label: "Appearance", icon: IconAppearance },
    { id: "library", label: "Library", icon: IconLibrary },
];

export default function SettingsView() {
    const [isDev, setIsDev] = useState(false);
    const [lastCategory, setLastCategory] = useSetting("lastCategory");
    const isLoading = useSettingsStore((state) => state.isLoading);

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

    if (isLoading) return null;

    return (
        <>
            <div className="pointer-events-none fixed h-(--spacing-titlebar-height) w-full translate-y-px border-b border-neutral-300 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900" />
            <div className="flex h-full gap-12">
                <div className="flex h-full max-w-[30vw] flex-2 justify-end border-r border-neutral-300 bg-black/4 bg-linear-to-b px-4 dark:border-neutral-800 dark:bg-white/2">
                    <SideBar
                        items={sidebarCategories}
                        activeItemId={activeCategory}
                        onActiveItemChange={setLastCategory}
                        className="pt-[calc(var(--spacing-titlebar-height)+2rem)]"
                    />
                </div>
                <div className="flex h-full flex-3 overflow-hidden">
                    {ActiveComponent && <ActiveComponent />}
                </div>
            </div>
        </>
    );
}
