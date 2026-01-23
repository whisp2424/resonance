import { type } from "arktype";

export const settingsSchema = type({
    appearance: {
        appTheme: "'system' | 'light' | 'dark'",
        trayIcon: "'auto' | 'white' | 'dark'",
    },
});

export type Settings = typeof settingsSchema.infer;
export type SettingsKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
    appearance: {
        appTheme: "system",
        trayIcon: "auto",
    },
};
