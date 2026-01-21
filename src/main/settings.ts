import { Store } from "@main/store";
import { type } from "arktype";

const appSettingsSchema = type({
    theme: "'system' | 'light' | 'dark'",
    trayIcon: "'auto' | 'white' | 'dark'",
});

export type AppSettings = typeof appSettingsSchema.infer;

export const DEFAULT_SETTINGS: AppSettings = {
    theme: "system",
    trayIcon: "auto",
};

export const settingsStore = new Store<AppSettings>({
    filename: "settings.json",
    defaults: DEFAULT_SETTINGS,
    encode: (data: AppSettings) => JSON.stringify(data, null, 0),
    decode: (data: unknown) => {
        const result = appSettingsSchema(data);
        if (result instanceof type.errors) return DEFAULT_SETTINGS;
        return result as AppSettings;
    },
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
