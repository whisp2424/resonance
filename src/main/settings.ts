import type { AppSettings } from "@shared/types/settings";
import type { Schema } from "electron-store";

import { Store } from "@main/store";

export type {
    AppTheme as ThemeMode,
    AppTrayIcon as TrayIconMode,
} from "@shared/types/settings";

export const DEFAULT_SETTINGS: AppSettings = {
    theme: "system",
    trayIcon: "auto",
};

const schema: Schema<AppSettings> = {
    theme: { type: "string", enum: ["system", "light", "dark"] },
    trayIcon: { type: "string", enum: ["auto", "white", "dark"] },
};

const store = new Store<AppSettings>({
    name: "settings",
    clearInvalidConfig: true,
    defaults: DEFAULT_SETTINGS,
    schema,
});

export const getSettings = (): AppSettings => {
    return { ...DEFAULT_SETTINGS, ...store.store };
};

export const getSetting = <K extends keyof AppSettings>(
    key: K,
): AppSettings[K] | undefined => {
    return store.get(key);
};

export const updateSettings = (settings: Partial<AppSettings>): AppSettings => {
    for (const [key, value] of Object.entries(settings))
        store.set(
            key as keyof AppSettings,
            value as AppSettings[keyof AppSettings],
        );

    return store.store;
};
