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
    tabsHistory: { tab: Tab; index: number }[];
}

interface TabsActions {
    addTab: (tab: TabOptions) => string;
    removeTab: (id: string) => void;
    restoreTab: () => void;
    reorderTabs: (fromIndex: number, toIndex: number) => void;
    setActiveTab: (id: string) => void;
}

export type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>((set, get) => ({
    tabs: [],
    activeId: null,
    tabsHistory: [],

    addTab: (options) => {
        const { tabs } = get();
        const id = hashKey(options.key);
        const existingTab = tabs.find((tab) => tab.id === id);

        if (existingTab) {
            if (options.activate !== false) set({ activeId: existingTab.id });
            return existingTab.id;
        }

        const newTab: Tab = {
            key: options.key,
            id,
            title: options.title,
            icon: options.icon,
            content: options.content,
            closable: options.closable ?? true,
            draggable: options.draggable ?? true,
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeId: options.activate !== false ? id : state.activeId,
        }));

        return id;
    },

    removeTab: (id) => {
        const { tabs, activeId, tabsHistory: closedTabs } = get();
        const tabToRemove = tabs.find((tab) => tab.id === id);

        if (!tabToRemove || !tabToRemove.closable) return;

        const removedIndex = tabs.findIndex((t) => t.id === id);
        const newTabs = tabs.filter((tab) => tab.id !== id);
        let newActiveId = activeId;

        if (activeId === id) {
            const nextTab = newTabs[removedIndex] ?? newTabs[removedIndex - 1];
            newActiveId = nextTab?.id ?? null;
        }

        set({
            tabs: newTabs,
            activeId: newActiveId,
            tabsHistory: [
                ...closedTabs,
                { tab: tabToRemove, index: removedIndex },
            ],
        });
    },

    restoreTab: () => {
        const { tabs, tabsHistory: closedTabs, activeId } = get();
        if (closedTabs.length === 0) return;

        const lastClosed = closedTabs[closedTabs.length - 1];
        if (!lastClosed) return;

        const { tab: tabToRestore, index: originalIndex } = lastClosed;
        const id = tabToRestore.id;

        // if tab already exists, remove it from history and restore the
        // previous tab
        const existingTab = tabs.find((tab) => tab.id === id);
        if (existingTab) {
            const newHistory = closedTabs.slice(0, -1);
            const previousEntry = newHistory[newHistory.length - 1];

            if (previousEntry) {
                const previousTab = tabs.find(
                    (tab) => tab.id === previousEntry.tab.id,
                );

                set({
                    activeId: previousTab ? previousTab.id : activeId,
                    tabsHistory: newHistory,
                });
            } else {
                set({ tabsHistory: newHistory });
            }
            return;
        }

        const insertIndex = Math.min(originalIndex, tabs.length);
        const newTabs = [...tabs];
        newTabs.splice(insertIndex, 0, tabToRestore);

        set({
            tabs: newTabs,
            activeId: id,
            tabsHistory: closedTabs.slice(0, -1),
        });
    },

    reorderTabs: (fromIndex, toIndex) => {
        set((state) => {
            const newTabs = [...state.tabs];
            const [movedTab] = newTabs.splice(fromIndex, 1);
            if (movedTab) newTabs.splice(toIndex, 0, movedTab);
            return { tabs: newTabs };
        });
    },

    setActiveTab: (id) => {
        set({ activeId: id });
    },
}));
