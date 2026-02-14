import type { ComponentType, ReactNode } from "react";

export interface Tab {
    id: string;
    title: string;
    icon?: ReactNode;
    content: ComponentType;
}
