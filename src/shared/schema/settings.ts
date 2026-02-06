import { type } from "arktype";

export const settingsSchema = type({
    lastCategory: "string",
    appearance: {
        appTheme: "'system' | 'light' | 'dark'",
        trayIcon: "'auto' | 'light' | 'dark'",
    },
});

export type Settings = typeof settingsSchema.infer;
export type SettingsKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
    lastCategory: "about",
    appearance: {
        appTheme: "system",
        trayIcon: "auto",
    },
};
