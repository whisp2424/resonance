import type { Tab } from "@renderer/lib/types/tabs";

import { create } from "zustand";

interface TabsState {
    tabs: Tab[];
    activeId: string | null;
}

interface TabsActions {
    addTab: (tab: Tab) => void;
    removeTab: (id: string) => void;
    moveTab: (fromIndex: number, toIndex: number) => void;
    setActiveTab: (id: string) => void;
}

export type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>((set, get) => ({
    tabs: [],
    activeId: null,

    addTab: (tab) => {
        set((state) => ({
            tabs: [...state.tabs, tab],
            activeId: tab.id,
        }));
    },

    removeTab: (id) => {
        const { tabs, activeId } = get();
        const tab = tabs.find((tab) => tab.id === id);

        if (!tab) return;
        if (tabs.length <= 1) return;

        const index = tabs.findIndex((tab) => tab.id === id);
        const rest = tabs.filter((tab) => tab.id !== id);
        let newActiveId = activeId;

        if (activeId === id) {
            const next = rest[index] ?? rest[index - 1];
            newActiveId = next?.id ?? null;
        }

        set({
            tabs: rest,
            activeId: newActiveId,
        });
    },

    moveTab: (fromIndex, toIndex) => {
        set((state) => {
            const newTabs = [...state.tabs];
            const [moved] = newTabs.splice(fromIndex, 1);
            if (moved) newTabs.splice(toIndex, 0, moved);
            return { tabs: newTabs };
        });
    },

    setActiveTab: (id) => {
        set({ activeId: id });
    },
}));
