import type { Settings } from "@shared/schema/settings";
import type { SettingsPath } from "@shared/types/ipc";
import type { DeepPartial, PathValue } from "@shared/types/utils";

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

    const updateSettings = useCallback(
        async (partial: DeepPartial<Settings>) => {
            await window.electron.invoke("settings:set", partial);
        },
        [],
    );

    const setSetting = useCallback(
        async <P extends SettingsPath>(
            path: P,
            value: PathValue<Settings, P>,
        ) => {
            await window.electron.invoke("settings:setPath", path, value);
        },
        [],
    );

    return [settings, updateSettings, setSetting] as const;
}
