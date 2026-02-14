import type { ReactNode } from "react";

import {
    subscribeToSettings,
    useSettingsStore,
} from "@renderer/lib/state/settingsStore";
import { useEffect } from "react";

interface SettingsProviderProps {
    children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
    const { loadSettings } = useSettingsStore();

    useEffect(() => {
        loadSettings();

        const unsubscribe = subscribeToSettings();

        return () => {
            unsubscribe();
        };
    }, [loadSettings]);

    return <>{children}</>;
}
