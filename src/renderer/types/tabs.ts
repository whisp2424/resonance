import type { IconElement } from "@renderer/types/iconElement";
import type { ComponentType } from "react";

export interface TabOptions {
    title: string;
    icon?: IconElement;
    content: ComponentType;
    closable?: boolean;
}

export interface Tab extends TabOptions {
    id: number;
    closable: boolean;
}
