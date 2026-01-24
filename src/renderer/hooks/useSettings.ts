import type { Settings } from "@shared/schema/settings";

import { useCallback, useEffect, useState } from "react";

export function useSettings() {
    const [settings, setSettings] = useState<Settings | null>(null);

    useEffect(() => {
        window.electron.invoke("settings:get").then(setSettings);

        const unsubscribeOnChanged = window.electron.send(
            "settings:onChanged",
            (newSettings) => setSettings(newSettings),
        );

        const unsubscribeOnError = window.electron.send(
            "settings:onError",
            (message) => console.error("Settings error:", message),
        );

        return () => {
            unsubscribeOnChanged();
            unsubscribeOnError();
        };
    }, []);

    const updateSettings = useCallback(async (partial: Partial<Settings>) => {
        await window.electron.invoke("settings:set", partial);
    }, []);

    return [settings, updateSettings] as const;
}
