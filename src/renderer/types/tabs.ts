import type { IconElement } from "@renderer/types/iconElement";
import type { ComponentType } from "react";

export type TabKey = unknown[];

export interface TabOptions {
    key: TabKey;
    title: string;
    icon?: IconElement;
    content: ComponentType;
    closable?: boolean;
    draggable?: boolean;
    activate?: boolean;
}

export interface Tab extends TabOptions {
    id: string;
    closable: boolean;
    draggable: boolean;
}
