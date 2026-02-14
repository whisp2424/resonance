import type { ComponentType } from "react";

export type TabParams = Record<string, unknown>;

export interface TabHistoryEntry {
    type: string;
    params: TabParams;
}

export interface TabDescriptor {
    id: string;
    type: string;
    params: TabParams;
    title: string;
    history: TabHistoryEntry[];
    historyIndex: number;
}

export interface ClosedTabEntry {
    tab: TabDescriptor;
    closedAt: number;
    index: number;
}

export interface TabTypeConfig {
    singleton: boolean;
    supportsHistory: boolean;
    title: string;
    icon?: ComponentType<{ className?: string }>;
    validator: (params: TabParams) => Promise<boolean> | boolean;
    component: ComponentType<{ tab: TabDescriptor }>;
}
