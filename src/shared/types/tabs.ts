import type { ComponentType } from "react";

/**
 * A string union where any defined tabs must be specified by their type name.
 */
export type TabType = "settings";

export interface SettingsParams {
    type: "settings";
}

export type TabParamsMap = {
    settings: SettingsParams;
};

export type TabParams = TabParamsMap[TabType];

export interface TabDescriptor {
    id: string;
    type: TabType;
    params: TabParams;
    title: string;
    history: { type: TabType; params: TabParams }[];
    historyIndex: number;
}

export interface ClosedTabEntry {
    tab: TabDescriptor;
    closedAt: number;
    index: number;
}

/**
 * Props passed to a tab's component.
 *
 * Includes common tab properties and any specific custom params, if any.
 */
export type TabComponentProps<T extends TabType> = TabParamsMap[T] & {
    id: string;
    type: T;
    title: string;
    history: { type: T; params: TabParamsMap[T] }[];
    historyIndex: number;
};

export interface TabTypeConfig<T extends TabType = TabType> {
    /** Whether only a single instance of this tab can exist at a time. */
    singleton: boolean;

    /** Whether this tab supports navigation. */
    supportsHistory: boolean;

    /** Default title to use for tabs of this type. */
    title: string;

    /** Optional icon to display in the tab bar. */
    icon?: ComponentType<{ className?: string }>;

    /** Validator to check if persisted params are still valid. */
    validator: (params: TabParams) => Promise<boolean> | boolean;

    /** The React component to render for this tab. */
    component: ComponentType<TabComponentProps<T>>;
}
