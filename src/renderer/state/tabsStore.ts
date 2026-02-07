import type { Tab, TabKey, TabOptions } from "@renderer/types/tabs";

import { create } from "zustand";

function hashKey(key: TabKey): string {
    return JSON.stringify(key, (_, val) => {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
            return Object.keys(val)
                .sort()
                .reduce((result, k) => {
                    result[k] = val[k];
                    return result;
                }, {});
        }
        return val;
    });
}

interface TabsState {
    tabs: Tab[];
    activeKeyHash: string | null;
}

interface TabsActions {
    addTab: (tab: TabOptions) => string;
    removeTab: (keyHash: string) => void;
    setActiveTab: (keyHash: string) => void;
}

export type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>((set, get) => ({
    tabs: [],
    activeKeyHash: null,

    addTab: (tabDefinition) => {
        const { tabs } = get();
        const keyHash = hashKey(tabDefinition.key);

        const existingTab = tabs.find((tab) => tab.keyHash === keyHash);

        if (existingTab) {
            set({ activeKeyHash: existingTab.keyHash });
            return existingTab.keyHash;
        }

        const newTab: Tab = {
            key: tabDefinition.key,
            keyHash,
            title: tabDefinition.title,
            icon: tabDefinition.icon,
            content: tabDefinition.content,
            closable: tabDefinition.closable ?? true,
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeKeyHash: keyHash,
        }));

        return keyHash;
    },

    removeTab: (keyHash) => {
        const { tabs, activeKeyHash } = get();
        const tabToRemove = tabs.find((tab) => tab.keyHash === keyHash);

        if (!tabToRemove || !tabToRemove.closable) return;

        const newTabs = tabs.filter((tab) => tab.keyHash !== keyHash);
        let newActiveKeyHash = activeKeyHash;

        if (activeKeyHash === keyHash) {
            const removedIndex = tabs.findIndex((t) => t.keyHash === keyHash);
            const nextTab = newTabs[removedIndex] ?? newTabs[removedIndex - 1];
            newActiveKeyHash = nextTab?.keyHash ?? null;
        }

        set({
            tabs: newTabs,
            activeKeyHash: newActiveKeyHash,
        });
    },

    setActiveTab: (keyHash) => {
        set({ activeKeyHash: keyHash });
    },
}));
