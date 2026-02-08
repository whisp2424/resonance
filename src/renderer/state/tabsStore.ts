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
    activeId: string | null;
}

interface TabsActions {
    addTab: (tab: TabOptions) => string;
    removeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    reorderTabs: (fromIndex: number, toIndex: number) => void;
}

export type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>((set, get) => ({
    tabs: [],
    activeId: null,

    addTab: (tabDefinition) => {
        const { tabs } = get();
        const id = hashKey(tabDefinition.key);

        const existingTab = tabs.find((tab) => tab.id === id);

        if (existingTab) {
            set({ activeId: existingTab.id });
            return existingTab.id;
        }

        const newTab: Tab = {
            key: tabDefinition.key,
            id,
            title: tabDefinition.title,
            icon: tabDefinition.icon,
            content: tabDefinition.content,
            closable: tabDefinition.closable ?? true,
            draggable: tabDefinition.draggable ?? true,
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeId: id,
        }));

        return id;
    },

    removeTab: (id) => {
        const { tabs, activeId } = get();
        const tabToRemove = tabs.find((tab) => tab.id === id);

        if (!tabToRemove || !tabToRemove.closable) return;

        const newTabs = tabs.filter((tab) => tab.id !== id);
        let newActiveId = activeId;

        if (activeId === id) {
            const removedIndex = tabs.findIndex((t) => t.id === id);
            const nextTab = newTabs[removedIndex] ?? newTabs[removedIndex - 1];
            newActiveId = nextTab?.id ?? null;
        }

        set({
            tabs: newTabs,
            activeId: newActiveId,
        });
    },

    setActiveTab: (id) => {
        set({ activeId: id });
    },

    reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
            const newTabs = [...state.tabs];
            const [movedTab] = newTabs.splice(fromIndex, 1);
            if (movedTab) {
                newTabs.splice(toIndex, 0, movedTab);
            }
            return { tabs: newTabs };
        });
    },
}));
