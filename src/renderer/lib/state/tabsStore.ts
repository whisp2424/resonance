import type {
    ClosedTabEntry,
    TabDescriptor,
    TabParamsMap,
    TabType,
} from "@shared/types/tabs";

import { useTitleBarStore } from "@renderer/lib/state/titlebarStore";
import {
    createDefaultTabs,
    defaultTabs,
    tabRegistry,
} from "@renderer/lib/tabRegistry";
import { getErrorMessage, log } from "@shared/utils/logger";
import { create } from "zustand";

const MAX_CLOSED_TABS = 50;

interface TabsState {
    tabs: TabDescriptor[];
    activeId: string | null;
    closedTabs: ClosedTabEntry[];
}

interface TabsActions {
    openTab: <T extends TabType>(
        type: T,
        params?: TabParamsMap[T],
        title?: string,
    ) => void;
    closeTab: (id: string) => void;
    restoreLastTab: () => void;
    activateTab: (id: string) => void;
    activateNextTab: () => void;
    activatePreviousTab: () => void;
    moveTab: (fromIndex: number, toIndex: number) => void;
    navigate: <T extends TabType>(
        type: T,
        params?: TabParamsMap[T],
        title?: string,
    ) => void;
    navigateBack: () => void;
    navigateForward: () => void;
    navigateReplace: <T extends TabType>(
        type: T,
        params?: TabParamsMap[T],
        title?: string,
    ) => void;
    restoreTabs: () => Promise<void>;
    persistTabs: () => Promise<void>;
}

export type TabsStore = TabsState & TabsActions;

export const useTabsStore = create<TabsStore>((set, get) => ({
    tabs: createDefaultTabs(defaultTabs),
    activeId: createDefaultTabs(defaultTabs)[0]!.id,
    closedTabs: [],

    openTab: (type, params, title) => {
        const { tabs, persistTabs } = get();
        const config = tabRegistry[type];

        if (!config) {
            log(`unknown tab type '${type}'`, "tabs", "warning");
            return;
        }

        if (config.singleton) {
            const existingTab = tabs.find((tab) => tab.type === type);
            if (existingTab) {
                set({ activeId: existingTab.id });
                return;
            }
        }

        const tabParams = params ?? ({ type } as TabParamsMap[typeof type]);

        const newTab: TabDescriptor = {
            id: crypto.randomUUID(),
            type,
            params: tabParams,
            title: title ?? config.title,
            history: config.supportsHistory
                ? [{ type, params: tabParams }]
                : [],
            historyIndex: config.supportsHistory ? 0 : -1,
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeId: newTab.id,
        }));

        persistTabs();
        useTitleBarStore.getState().trigger();
    },

    closeTab: (id) => {
        const { tabs, activeId, persistTabs } = get();

        if (tabs.length <= 1) return;

        const index = tabs.findIndex((tab) => tab.id === id);
        if (index === -1) return;

        const tab = tabs[index];
        const rest = tabs.filter((t) => t.id !== id);
        let newActiveId = activeId;

        if (activeId === id) {
            const next = rest[index] ?? rest[index - 1];
            newActiveId = next?.id ?? null;
        }

        set((state) => {
            const newClosedTabs = [
                ...state.closedTabs,
                { tab, closedAt: Date.now(), index },
            ];

            if (newClosedTabs.length > MAX_CLOSED_TABS) newClosedTabs.shift();

            return {
                tabs: rest,
                activeId: newActiveId,
                closedTabs: newClosedTabs,
            };
        });

        persistTabs();
        useTitleBarStore.getState().trigger();
    },

    restoreLastTab: () => {
        const { closedTabs, tabs, persistTabs } = get();
        if (closedTabs.length === 0) return;

        for (let i = closedTabs.length - 1; i >= 0; i--) {
            const entry = closedTabs[i];
            const config = tabRegistry[entry.tab.type];

            if (!config) {
                set((state) => ({
                    closedTabs: state.closedTabs.filter((_, idx) => idx !== i),
                }));
                continue;
            }

            if (config.singleton) {
                const exists = tabs.some((t) => t.type === entry.tab.type);
                if (exists) {
                    set((state) => ({
                        closedTabs: state.closedTabs.filter(
                            (_, idx) => idx !== i,
                        ),
                    }));
                    continue;
                }
            }

            const newTabs = [...tabs];
            const insertIndex = Math.min(entry.index, newTabs.length);
            newTabs.splice(insertIndex, 0, entry.tab);

            set((state) => ({
                tabs: newTabs,
                activeId: entry.tab.id,
                closedTabs: state.closedTabs.slice(0, -1),
            }));

            persistTabs();
            useTitleBarStore.getState().trigger();
            return;
        }
    },

    activateTab: (id) => {
        const { persistTabs } = get();
        set({ activeId: id });
        persistTabs();
    },

    activateNextTab: () => {
        const { tabs, activeId, persistTabs } = get();
        if (tabs.length === 0) return;

        const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
        const nextIndex = (currentIndex + 1) % tabs.length;
        set({ activeId: tabs[nextIndex].id });
        persistTabs();
    },

    activatePreviousTab: () => {
        const { tabs, activeId, persistTabs } = get();
        if (tabs.length === 0) return;

        const currentIndex = tabs.findIndex((tab) => tab.id === activeId);
        const prevIndex =
            currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
        set({ activeId: tabs[prevIndex].id });
        persistTabs();
    },

    moveTab: (fromIndex, toIndex) => {
        const { persistTabs } = get();

        set((state) => {
            const newTabs = [...state.tabs];
            const [moved] = newTabs.splice(fromIndex, 1);
            if (moved) newTabs.splice(toIndex, 0, moved);
            return { tabs: newTabs };
        });

        persistTabs();
    },

    navigate: (type, params, title) => {
        const { tabs, activeId, persistTabs } = get();
        if (!activeId) return;

        const tabIndex = tabs.findIndex((tab) => tab.id === activeId);
        if (tabIndex === -1) return;

        const tab = tabs[tabIndex];
        const config = tabRegistry[type];

        if (!config) {
            log(`unknown tab type: ${type}`, "tabs", "warning");
            return;
        }

        const tabParams = params ?? ({ type } as TabParamsMap[typeof type]);

        if (!config.supportsHistory) {
            if (config.singleton) {
                const existingTab = tabs.find((t) => t.type === type);
                if (existingTab && existingTab.id !== activeId) {
                    set({ activeId: existingTab.id });
                    return;
                }
            }

            const newTabs = [...tabs];
            newTabs[tabIndex] = {
                ...tab,
                type,
                params: tabParams,
                title: title ?? config.title,
            };
            set({ tabs: newTabs });
            persistTabs();
            return;
        }

        const newHistoryEntry = {
            type,
            params: tabParams,
        };

        const newHistory = tab.history.slice(0, tab.historyIndex + 1);
        newHistory.push(newHistoryEntry);

        const newTabs = [...tabs];
        newTabs[tabIndex] = {
            ...tab,
            type,
            params: tabParams,
            title: title ?? config.title,
            history: newHistory,
            historyIndex: newHistory.length - 1,
        };

        set({ tabs: newTabs });
        persistTabs();
    },

    navigateBack: () => {
        const { tabs, activeId, persistTabs } = get();
        if (!activeId) return;

        const tabIndex = tabs.findIndex((tab) => tab.id === activeId);
        if (tabIndex === -1) return;

        const tab = tabs[tabIndex];
        if (tab.historyIndex <= 0) return;

        const newHistoryIndex = tab.historyIndex - 1;
        const historyEntry = tab.history[newHistoryIndex];

        const newTabs = [...tabs];
        newTabs[tabIndex] = {
            ...tab,
            type: historyEntry.type,
            params: historyEntry.params,
            historyIndex: newHistoryIndex,
        };

        set({ tabs: newTabs });
        persistTabs();
    },

    navigateForward: () => {
        const { tabs, activeId, persistTabs } = get();
        if (!activeId) return;

        const tabIndex = tabs.findIndex((tab) => tab.id === activeId);
        if (tabIndex === -1) return;

        const tab = tabs[tabIndex];
        if (tab.historyIndex >= tab.history.length - 1) return;

        const newHistoryIndex = tab.historyIndex + 1;
        const historyEntry = tab.history[newHistoryIndex];

        const newTabs = [...tabs];
        newTabs[tabIndex] = {
            ...tab,
            type: historyEntry.type,
            params: historyEntry.params,
            historyIndex: newHistoryIndex,
        };

        set({ tabs: newTabs });
        persistTabs();
    },

    navigateReplace: (type, params, title) => {
        const { tabs, activeId, persistTabs } = get();
        if (!activeId) return;

        const tabIndex = tabs.findIndex((tab) => tab.id === activeId);
        if (tabIndex === -1) return;

        const tab = tabs[tabIndex];
        const config = tabRegistry[type];

        if (!config) {
            log(`unknown tab type: ${type}`, "tabs", "warning");
            return;
        }

        const tabParams = params ?? ({ type } as TabParamsMap[typeof type]);

        if (!config.supportsHistory) {
            const newTabs = [...tabs];
            newTabs[tabIndex] = {
                ...tab,
                type,
                params: tabParams,
                title: title ?? config.title,
            };
            set({ tabs: newTabs });
            persistTabs();
            return;
        }

        const newHistoryEntry = {
            type,
            params: tabParams,
        };

        const newHistory = [...tab.history];
        newHistory[tab.historyIndex] = newHistoryEntry;

        const newTabs = [...tabs];
        newTabs[tabIndex] = {
            ...tab,
            type,
            params: tabParams,
            title: title ?? config.title,
            history: newHistory,
        };

        set({ tabs: newTabs });
        persistTabs();
    },

    restoreTabs: async () => {
        try {
            const persisted = await electron.invoke("tabs:get");

            if (!persisted || persisted.tabs.length === 0) {
                const defaults = createDefaultTabs(defaultTabs);
                set({
                    tabs: defaults,
                    activeId: defaults[0]!.id,
                });
                return;
            }

            const validTabs: TabDescriptor[] = [];
            for (const tab of persisted.tabs) {
                const config = tabRegistry[tab.type];
                if (!config) continue;

                const isValid = await config.validator(tab.params);
                if (isValid) {
                    validTabs.push(tab);
                }
            }

            if (validTabs.length === 0) {
                const defaults = createDefaultTabs(defaultTabs);
                set({
                    tabs: defaults,
                    activeId: defaults[0]!.id,
                });
                return;
            }

            const activeTabExists = validTabs.some(
                (tab) => tab.id === persisted.activeId,
            );

            set({
                tabs: validTabs,
                activeId: activeTabExists
                    ? persisted.activeId
                    : validTabs[0].id,
            });
        } catch (err) {
            log(getErrorMessage(err), "tabs", "error");
            const defaults = createDefaultTabs(defaultTabs);
            set({
                tabs: defaults,
                activeId: defaults[0]!.id,
            });
        }
    },

    persistTabs: async () => {
        const { tabs, activeId } = get();
        try {
            await electron.invoke("tabs:set", tabs, activeId);
        } catch (err) {
            log(getErrorMessage(err), "tabs", "error");
        }
    },
}));
