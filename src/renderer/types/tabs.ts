import type { IconElement } from "@renderer/types/iconElement";
import type { ComponentType } from "react";

export interface Tab {
    id: string;
    type?: string;
    params?: Record<string, unknown>;
    title: string;
    icon?: IconElement;
    content: ComponentType;
}

export interface EphemeralTabOptions {
    title: string;
    icon: IconElement;
    content: ComponentType;
    activate?: boolean;
}

export interface RestorableTabOptions {
    activate?: boolean;
}
