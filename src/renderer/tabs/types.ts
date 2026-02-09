import type { IconElement } from "@renderer/types/iconElement";
import type { ComponentType } from "react";

export interface TabType<
    TParams extends Record<string, unknown> = Record<string, unknown>,
> {
    type: string;
    singleton: boolean;
    persistable: boolean;
    icon: IconElement;
    getComponent: (params: TParams) => ComponentType;
    getTitle: (params: TParams) => string;
    validate?: (params: TParams) => boolean | Promise<boolean>;
}

export type TabTypeDefinition = TabType<Record<string, unknown>>;
