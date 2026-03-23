import type { ReactNode } from "react";

import {
    useSettingsListeners,
    useSettingsStore,
} from "@renderer/lib/settings/settingsStore";
import { useEffect } from "react";

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const { loadSettings } = useSettingsStore();

    useEffect(() => {
        loadSettings();
    }, [loadSettings]);

    useSettingsListeners();

    return <>{children}</>;
}
