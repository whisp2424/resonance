import { type } from "arktype";

const audioOutputDeviceSchema = type({
    id: "string",
    label: "string",
});

/**
 * The canonical settings schema.
 *
 * For additive fields, update this schema and DEFAULT_SETTINGS together.
 *
 * If older persisted data would no longer normalize into this shape
 * correctly, add a migration step in `SettingsManager`.
 */
export const settingsSchema = type({
    schemaVersion: "1",
    lastCategory: "string",
    appearance: {
        appTheme: "'system' | 'light' | 'dark'",
        autoHideTitleBar: "boolean",
        trayIcon: "'auto' | 'light' | 'dark'",
    },
    audio: {
        playback: {
            resumeOnStartup: "boolean",
        },
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
    schemaVersion: 1,
    lastCategory: "about",
    appearance: {
        appTheme: "system",
        autoHideTitleBar: true,
        trayIcon: "auto",
    },
    audio: {
        playback: {
            resumeOnStartup: false,
        },
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
