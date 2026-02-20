import type {
    TabDescriptor,
    TabParamsMap,
    TabType,
    TabTypeConfig,
} from "@shared/types/tabs";

import SettingsView from "@renderer/components/views/SettingsView";

import IconSettings from "~icons/lucide/settings";

export const tabRegistry: {
    settings: TabTypeConfig<"settings">;
} = {
    settings: {
        singleton: true,
        supportsHistory: false,
        title: "Settings",
        icon: IconSettings,
        validator: () => true,
        component: SettingsView,
    },
};

interface DefaultTabEntry<T extends TabType> {
    type: T;
    params: TabParamsMap[T];
    title?: string;
}

export const defaultTabs: DefaultTabEntry<TabType>[] = [
    {
        type: "settings",
        title: "Settings",
        params: {
            type: "settings",
        },
    },
];

export function createDefaultTabs<T extends TabType>(
    tabs: DefaultTabEntry<T>[],
): TabDescriptor[] {
    return tabs.map(({ type, params, title }) => {
        const config = tabRegistry[type];
        if (!config) throw new Error(`Unknown tab type: ${type}`);

        return {
            id: crypto.randomUUID(),
            type,
            params,
            title: title ?? config.title,
            history: config.supportsHistory ? [{ type, params }] : [],
            historyIndex: config.supportsHistory ? 0 : -1,
        };
    });
}
