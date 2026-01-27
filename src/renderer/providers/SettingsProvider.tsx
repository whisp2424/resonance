import type { Settings } from "@shared/schema/settings";
import type { SettingsPath } from "@shared/types/ipc";
import type { DeepPartial, PathValue } from "@shared/types/utils";

import { SettingsContext } from "@renderer/contexts/SettingsContext";
import { useCallback, useEffect, useMemo, useState } from "react";

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<Settings | null>(null);

    useEffect(() => {
        window.electron.invoke("settings:get").then(setSettings);

        const unsubscribeOnChanged = window.electron.send(
            "settings:onChanged",
            (newSettings) => setSettings(newSettings),
        );

        return () => unsubscribeOnChanged();
    }, []);

    const updateSettings = useCallback(
        async (partial: DeepPartial<Settings>) =>
            await window.electron.invoke("settings:set", partial),
        [],
    );

    const setSetting = useCallback(
        async <P extends SettingsPath>(
            path: P,
            value: PathValue<Settings, P>,
        ) => await window.electron.invoke("settings:setPath", path, value),
        [],
    );

    const value = useMemo(
        () => ({ settings, updateSettings, setSetting }),
        [settings, updateSettings, setSetting],
    );

    if (!settings) return null;

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    );
}
