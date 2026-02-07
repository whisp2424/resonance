import type { Tab, TabOptions } from "@renderer/types/tabs";

import { create } from "zustand";

interface TabsState {
    tabs: Tab[];
    activeTabId: number | null;
    nextId: number;
}

interface TabsActions {
    addTab: (tab: TabOptions) => number;
    removeTab: (id: number) => void;
    setActiveTab: (id: number) => void;
}

export type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>((set, get) => ({
    tabs: [],
    activeTabId: null,
    nextId: 1,

    addTab: (tabDefinition) => {
        const id = get().nextId;

        const newTab: Tab = {
            id,
            title: tabDefinition.title,
            icon: tabDefinition.icon,
            content: tabDefinition.content,
            closable: tabDefinition.closable ?? true,
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeTabId: id,
            nextId: id + 1,
        }));

        return id;
    },

    removeTab: (id) => {
        const { tabs, activeTabId } = get();
        const tabToRemove = tabs.find((tab) => tab.id === id);

        if (!tabToRemove || !tabToRemove.closable) return;

        const newTabs = tabs.filter((tab) => tab.id !== id);
        let newActiveTabId = activeTabId;

        if (activeTabId === id) {
            const removedIndex = tabs.findIndex((t) => t.id === id);
            const nextTab = newTabs[removedIndex] ?? newTabs[removedIndex - 1];
            newActiveTabId = nextTab?.id ?? null;
        }

        set({
            tabs: newTabs,
            activeTabId: newActiveTabId,
        });
    },

    setActiveTab: (id) => {
        set({ activeTabId: id });
    },
}));
