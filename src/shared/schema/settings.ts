import { type } from "arktype";

const audioOutputDeviceSchema = type({
    id: "string",
    label: "string",
});

export const settingsSchema = type({
    lastCategory: "string",
    appearance: {
        appTheme: "'system' | 'light' | 'dark'",
        trayIcon: "'auto' | 'light' | 'dark'",
    },
    audio: {
        output: {
            deviceId: "string",
            onDisconnectRouting: "'switch_to_default' | 'keep_preferred'",
            pauseOnDisconnect: "boolean",
            resumeOnReconnect: "boolean",
            notifyChanges: "'none' | 'startup' | 'always'",
            knownDevices: audioOutputDeviceSchema.array(),
        },
    },
});

export type AudioOutputDevice = typeof audioOutputDeviceSchema.infer;
export type Settings = typeof settingsSchema.infer;
export type SettingsKey = keyof Settings;

export const DEFAULT_SETTINGS: Settings = {
    lastCategory: "about",
    appearance: {
        appTheme: "system",
        trayIcon: "auto",
    },
    audio: {
        output: {
            deviceId: "default",
            notifyChanges: "none",
            pauseOnDisconnect: false,
            resumeOnReconnect: false,
            onDisconnectRouting: "switch_to_default",
            knownDevices: [],
        },
    },
};
