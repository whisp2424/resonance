import type { AppSettings } from "@shared/types/settings";

import { useCallback, useEffect, useState } from "react";

export function useSettings() {
    const [settings, setSettings] = useState<AppSettings | null>(null);

    useEffect(() => {
        let mounted = true;

        (async function loadSettings() {
            const data = await electron.invoke("settings:get");
            if (mounted) setSettings(data);
        })();

        const unsubscribe = electron.send(
            "settings:onChanged",
            ({ settings: newSettings }) => {
                if (mounted) setSettings(newSettings);
            },
        );

        return () => {
            mounted = false;
            unsubscribe?.();
        };
    }, []);

    const updateSettings = useCallback(
        async (settings: Partial<AppSettings>) => {
            const newSettings = await electron.invoke(
                "settings:update",
                settings,
            );

            setSettings(newSettings);
            return newSettings;
        },
        [],
    );

    return { settings, updateSettings };
}
