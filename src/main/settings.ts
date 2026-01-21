import type { AppSettings } from "@shared/types/settings";
import type { Schema } from "electron-store";

import { Store } from "@main/store";

export const DEFAULT_SETTINGS: AppSettings = {
    theme: "system",
    trayIcon: "auto",
};

const schema: Schema<AppSettings> = {
    theme: { type: "string", enum: ["system", "light", "dark"] },
    trayIcon: { type: "string", enum: ["auto", "white", "dark"] },
};

export const settingsStore = new Store<AppSettings>({
    name: "settings",
    clearInvalidConfig: true,
    defaults: DEFAULT_SETTINGS,
    schema,
});

export const getSettings = (): AppSettings => {
    return { ...DEFAULT_SETTINGS, ...settingsStore.store };
};

export const getSetting = <K extends keyof AppSettings>(
    key: K,
): AppSettings[K] | undefined => {
    return settingsStore.get(key);
};

export const updateSettings = (settings: Partial<AppSettings>): AppSettings => {
    for (const [key, value] of Object.entries(settings))
        settingsStore.set(
            key as keyof AppSettings,
            value as AppSettings[keyof AppSettings],
        );

    return settingsStore.store;
};
