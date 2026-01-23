import type { Settings } from "@shared/schema/settings";

import { useCallback, useEffect, useState } from "react";

export function useSettings() {
    const [settings, setSettings] = useState<Settings | null>(null);

    useEffect(() => {
        window.electron.settings.get().then(setSettings);

        const unsubscribeOnChanged = window.electron.settings.onChanged(
            (newSettings) => setSettings(newSettings),
        );

        const unsubscribeOnError = window.electron.settings.onError((message) =>
            console.error("Settings error:", message),
        );

        return () => {
            unsubscribeOnChanged();
            unsubscribeOnError();
        };
    }, []);

    const updateSettings = useCallback(async (partial: Partial<Settings>) => {
        await window.electron.settings.set(partial);
    }, []);

    return [settings, updateSettings] as const;
}
