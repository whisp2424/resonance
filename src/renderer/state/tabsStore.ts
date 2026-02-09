import type {
    EphemeralTabOptions,
    RestorableTabOptions,
    Tab,
} from "@renderer/types/tabs";
import type { TabState } from "@shared/schema/tabState";

import { tabRegistry } from "@renderer/tabs/registry";
import { getErrorMessage, log } from "@shared/utils/logger";
import { create } from "zustand";

function generateId(): string {
    return crypto.randomUUID();
}

interface TabsState {
    tabs: Tab[];
    activeId: string | null;
    tabsHistory: { tab: Tab; index: number }[];
}

interface TabsActions {
    newEphemeralTab: (options: EphemeralTabOptions) => string;
    newRestorableTab: <TParams extends Record<string, unknown>>(
        type: string,
        params: TParams,
        options?: RestorableTabOptions,
    ) => string;
    removeTab: (id: string) => void;
    restoreTab: () => void;
    moveTab: (fromIndex: number, toIndex: number) => void;
    setActiveTab: (id: string) => void;
    persistState: () => void;
    restoreTabs: () => Promise<void>;
}

export type TabsStore = TabsState & TabsActions;

const DEBOUNCE_MS = 500;

let debounceTimeout: ReturnType<typeof setTimeout> | null = null;

export const useTabsStore = create<TabsStore>((set, get) => ({
    tabs: [],
    activeId: null,
    tabsHistory: [],

    newEphemeralTab: (options) => {
        const id = generateId();

        const newTab: Tab = {
            id,
            title: options.title,
            icon: options.icon,
            content: options.content,
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeId: options.activate !== false ? id : state.activeId,
        }));

        get().persistState();

        return id;
    },

    newRestorableTab: (type, params, options) => {
        const tabType = tabRegistry.get(type);
        if (!tabType) throw new Error(`Unknown tab type "${type}"`);

        const { tabs } = get();

        if (tabType.singleton) {
            const existingTab = tabs.find((tab) => tab.type === type);
            if (existingTab) {
                if (options?.activate !== false) {
                    set({ activeId: existingTab.id });
                    get().persistState();
                }

                return existingTab.id;
            }
        }

        const id = generateId();
        const newTab: Tab = {
            id,
            type,
            params,
            title: tabType.getTitle(params),
            icon: tabType.icon,
            content: tabType.getComponent(params),
        };

        set((state) => ({
            tabs: [...state.tabs, newTab],
            activeId: options?.activate !== false ? id : state.activeId,
        }));

        get().persistState();
        return id;
    },

    removeTab: (id) => {
        const { tabs, activeId, tabsHistory } = get();
        const tab = tabs.find((tab) => tab.id === id);

        if (!tab) return;
        if (tabs.length <= 1) return;

        const index = tabs.findIndex((tab) => tab.id === id);
        const rest = tabs.filter((tab) => tab.id !== id);
        let newActiveId = activeId;

        // activate adjacent tab when removing active tab
        if (activeId === id) {
            const next = rest[index] ?? rest[index - 1];
            newActiveId = next.id;
        }

        set({
            tabs: rest,
            activeId: newActiveId,
            tabsHistory: [...tabsHistory, { tab, index }],
        });

        get().persistState();
    },

    restoreTab: () => {
        const { tabs, tabsHistory } = get();
        if (tabsHistory.length === 0) return;

        let history = [...tabsHistory];
        let restoredTab: Tab | null = null;
        let restoredIndex = -1;

        while (history.length > 0) {
            const lastTab = history[history.length - 1];
            if (!lastTab) break;

            const { tab, index } = lastTab;

            if (tabs.find((existingTab) => existingTab.id === tab.id)) {
                history = history.slice(0, -1);
                continue;
            }

            if (tab.type) {
                const type = tabRegistry.get(tab.type);
                if (
                    type?.singleton &&
                    tabs.find((existingTab) => existingTab.type === tab.type)
                ) {
                    history = history.slice(0, -1);
                    continue;
                }
            }

            restoredTab = tab;
            restoredIndex = index;
            history = history.slice(0, -1);
            break;
        }

        if (restoredTab) {
            const insertIndex = Math.min(restoredIndex, tabs.length);
            const newTabs = [...tabs];
            newTabs.splice(insertIndex, 0, restoredTab);

            set({
                tabs: newTabs,
                activeId: restoredTab.id,
                tabsHistory: history,
            });

            get().persistState();
        } else set({ tabsHistory: history });
    },

    moveTab: (fromIndex, toIndex) => {
        set((state) => {
            const newTabs = [...state.tabs];
            const [moved] = newTabs.splice(fromIndex, 1);
            if (moved) newTabs.splice(toIndex, 0, moved);
            return { tabs: newTabs };
        });

        get().persistState();
    },

    setActiveTab: (id) => {
        set({ activeId: id });
        get().persistState();
    },

    // save restorable tabs to disk with debounce
    persistState: () => {
        if (debounceTimeout) clearTimeout(debounceTimeout);

        debounceTimeout = setTimeout(async () => {
            const { tabs, activeId } = get();

            // only persist tabs marked as persistable
            const persistable = tabs.filter((tab) => {
                if (!tab.type) return false;
                const type = tabRegistry.get(tab.type);
                return type?.persistable ?? false;
            });

            const state: TabState = {
                tabs: persistable.map((tab) => ({
                    id: tab.id,
                    type: tab.type!,
                    params: tab.params ?? {},
                })),
                activeId,
            };

            try {
                await electron.invoke("tabState:save", state);
            } catch (err) {
                log(
                    `failed to save tab state: ${getErrorMessage(err)}`,
                    "tabsStore",
                    "warning",
                );
            }
        }, DEBOUNCE_MS);
    },

    // restore persisted tabs from disk on startup
    restoreTabs: async () => {
        try {
            const persistedData = await electron.invoke("tabState:get");
            if (!persistedData) return;

            const { tabs: currentTabs } = get();
            const restoredTabs: Tab[] = [];

            // validate and restore each persisted tab
            for (const data of persistedData.tabs) {
                const type = tabRegistry.get(data.type);
                if (!type || !type.persistable) continue;

                const exists =
                    currentTabs.find((tab) => tab.id === data.id) ||
                    restoredTabs.find((tab) => tab.id === data.id);
                if (exists) continue;

                if (type.singleton) {
                    const duplicate =
                        currentTabs.find((t) => t.type === data.type) ||
                        restoredTabs.find((t) => t.type === data.type);
                    if (duplicate) continue;
                }

                const isValidParams =
                    typeof data.params === "object" &&
                    data.params !== null &&
                    !Array.isArray(data.params);

                if (!isValidParams) continue;

                const params = data.params as Record<string, unknown>;

                if (type.validate) {
                    try {
                        const valid = await type.validate(params);
                        if (!valid) continue;
                    } catch (err) {
                        log(getErrorMessage(err), "tabsStore", "warning");
                        continue;
                    }
                }

                restoredTabs.push({
                    id: data.id,
                    type: data.type,
                    params,
                    title: type.getTitle(params),
                    icon: type.icon,
                    content: type.getComponent(params),
                });
            }

            if (restoredTabs.length > 0) {
                set((state) => {
                    const newTabs = [...state.tabs, ...restoredTabs];
                    const isValid =
                        persistedData.activeId &&
                        newTabs.some(
                            (tab) => tab.id === persistedData.activeId,
                        );
                    return {
                        tabs: newTabs,
                        activeId: isValid
                            ? persistedData.activeId
                            : state.activeId,
                    };
                });
            }
        } catch (err) {
            log(
                `failed to restore tabs: ${getErrorMessage(err)}`,
                "tabsStore",
                "error",
            );
        }
    },
}));
