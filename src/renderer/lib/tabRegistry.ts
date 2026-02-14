import type { TabDescriptor, TabTypeConfig } from "@shared/types/tabs";

import SettingsView from "@renderer/components/views/SettingsView";

import IconSettings from "~icons/lucide/settings";

export const tabTypeRegistry: Record<string, TabTypeConfig> = {
    settings: {
        singleton: true,
        supportsHistory: false,
        title: "Settings",
        icon: IconSettings,
        validator: () => true,
        component: SettingsView,
    },
    empty: {
        singleton: false,
        supportsHistory: false,
        title: "New Tab",
        validator: () => true,
        component: () => null,
    },
};

interface DefaultTabEntry {
    type: string;
    params: Record<string, unknown>;
    title?: string;
}

export const defaultTabs: DefaultTabEntry[] = [
    { type: "settings", params: { type: "settings" } },
];

export function createDefaultTabs(): TabDescriptor[] {
    return defaultTabs.map(({ type, params, title }) => {
        const config = tabTypeRegistry[type];
        if (!config) {
            throw new Error(`Unknown tab type: ${type}`);
        }

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
