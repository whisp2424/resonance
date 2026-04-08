import type { Settings } from "@shared/schema/settings";
import type { SettingsPath } from "@shared/types/ipc";
import type { DeepPartial, PathValue } from "@shared/types/utils";
import type { FSWatcher } from "chokidar";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { windowManager } from "@main/window/windowManager";
import { DEFAULT_SETTINGS, settingsSchema } from "@shared/schema/settings";
import { getErrorMessage } from "@shared/utils/logger";
import { deepMerge, setDeep } from "@shared/utils/object";
import { type } from "arktype";
import { watch } from "chokidar";
import { app, dialog, shell } from "electron";
import writeFile from "write-file-atomic";

import product from "@main/../../build/product.json" with { type: "json" };

const SETTINGS_FILE = join(app.getPath("userData"), "settings.json");
const CURRENT_SETTINGS_VERSION = DEFAULT_SETTINGS.schemaVersion;

type SettingsKey = keyof Settings;

class UnsupportedSettingsVersionError extends Error {
    constructor(_version: number) {
        super(
            `The existing settings file is made for a newer version of ${product.name.short}, and is not supported by the current version`,
        );
        this.name = "UnsupportedSettingsVersionError";
    }
}

interface ListenerEntry {
    callback: (settings: Settings, key?: SettingsKey) => void;
    key?: SettingsKey;
}

interface NormalizedSettingsResult {
    settings: Settings;
    didChange: boolean;
}

class SettingsManager {
    private settingsCache: Settings | null = null;
    private fileWatcher: FSWatcher | null = null;
    private isWriting = false;
    private listeners: Set<ListenerEntry> = new Set();

    onChanged(
        listener: (settings: Settings, key?: SettingsKey) => void,
        key?: SettingsKey,
    ): () => void {
        const entry: ListenerEntry = { callback: listener, key };
        this.listeners.add(entry);
        return () => this.listeners.delete(entry);
    }

    async load(): Promise<Settings> {
        try {
            const rawData = await readFile(SETTINGS_FILE, "utf-8");
            const jsonData = JSON.parse(rawData);
            const result = this.normalizeSettings(jsonData);

            if (result.didChange) {
                await this.write(result.settings);
                return this.get();
            }

            this.settingsCache = result.settings;
            return result.settings;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                await this.write(DEFAULT_SETTINGS);
                this.settingsCache = DEFAULT_SETTINGS;
                return this.settingsCache;
            }
            throw err;
        }
    }

    get(): Settings {
        if (!this.settingsCache)
            throw new Error("Settings not loaded. Call load() first.");
        return this.settingsCache;
    }

    async update(
        partial: DeepPartial<Settings>,
    ): Promise<SettingsKey | undefined> {
        const merged = settingsSchema(deepMerge(this.get(), partial));
        if (merged instanceof type.errors) throw new Error(merged.summary);
        return await this.write(merged);
    }

    async setPath<P extends SettingsPath>(
        path: P,
        value: PathValue<Settings, P>,
    ): Promise<SettingsKey | undefined> {
        const updated = settingsSchema(
            setDeep(
                this.get() as unknown as Record<string, unknown>,
                path,
                value,
            ),
        );

        if (updated instanceof type.errors) throw new Error(updated.summary);
        return await this.write(updated);
    }

    async reset(): Promise<void> {
        this.isWriting = true;
        try {
            await writeFile(
                SETTINGS_FILE,
                JSON.stringify(DEFAULT_SETTINGS, null, 2),
                { encoding: "utf-8" },
            );
            this.settingsCache = DEFAULT_SETTINGS;
            this.emitChanges(this.settingsCache, undefined);
            windowManager.emitEvent("settings:onChanged", this.settingsCache);
        } finally {
            this.isWriting = false;
        }
    }

    startWatcher(): void {
        if (this.fileWatcher) return;
        this.fileWatcher = watch(SETTINGS_FILE, { ignoreInitial: true });
        this.fileWatcher.on("change", () => this.onExternalChanges());
    }

    dispose(): void {
        this.fileWatcher?.close();
        this.fileWatcher = null;
    }

    private async write(
        newSettings: Settings,
    ): Promise<SettingsKey | undefined> {
        this.isWriting = true;
        let changedKey: SettingsKey | undefined;
        try {
            const oldSettings = this.settingsCache;
            await writeFile(
                SETTINGS_FILE,
                JSON.stringify(newSettings, null, 2),
                { encoding: "utf-8" },
            );
            this.settingsCache = newSettings;

            if (oldSettings) {
                for (const key of Object.keys(oldSettings) as SettingsKey[]) {
                    if (
                        JSON.stringify(oldSettings[key]) !==
                        JSON.stringify(newSettings[key])
                    ) {
                        changedKey = key;
                        break;
                    }
                }
            }

            this.emitChanges(this.settingsCache, changedKey);
            windowManager.emitEvent("settings:onChanged", this.settingsCache);
        } finally {
            this.isWriting = false;
        }
        return changedKey;
    }

    private emitChanges(settings: Settings, key?: SettingsKey): void {
        for (const entry of this.listeners) {
            if (entry.key === undefined || entry.key === key)
                entry.callback(settings, key);
        }
    }

    private async onExternalChanges(): Promise<void> {
        if (this.isWriting) return;

        try {
            const data = await readFile(SETTINGS_FILE, "utf-8");
            const parsed = JSON.parse(data);
            const result = this.normalizeSettings(parsed);

            if (result.didChange) {
                await this.write(result.settings);
                return;
            }

            const oldSettings = this.settingsCache;
            this.settingsCache = result.settings;

            let changedKey: SettingsKey | undefined;

            if (oldSettings) {
                for (const key of Object.keys(oldSettings) as SettingsKey[]) {
                    if (
                        JSON.stringify(oldSettings[key]) !==
                        JSON.stringify(result.settings[key])
                    ) {
                        changedKey = key;
                        break;
                    }
                }
            }

            this.emitChanges(this.settingsCache, changedKey);
            windowManager.emitEvent("settings:onChanged", this.settingsCache);
        } catch (err) {
            const message =
                err instanceof SyntaxError
                    ? "External settings file is invalid JSON"
                    : getErrorMessage(err);
            windowManager.emitEvent("settings:onError", message);
        }
    }

    private normalizeSettings(raw: unknown): NormalizedSettingsResult {
        const normalized = this.migrateSettings(raw);
        const result = settingsSchema(normalized);
        if (result instanceof type.errors) throw new Error(result.summary);

        return {
            settings: result,
            didChange: JSON.stringify(raw) !== JSON.stringify(result),
        };
    }

    private migrateSettings(raw: unknown): Settings {
        const source = this.getSettingsRecord(raw);
        const sourceVersion = this.getSchemaVersion(source);

        if (sourceVersion > CURRENT_SETTINGS_VERSION)
            throw new UnsupportedSettingsVersionError(sourceVersion);

        let migrated = this.upgradeSettingsToCurrentSchema(
            source,
            sourceVersion,
        );

        migrated = {
            ...migrated,
            schemaVersion: CURRENT_SETTINGS_VERSION,
        };

        const result = settingsSchema(migrated);
        if (result instanceof type.errors) throw new Error(result.summary);
        return result;
    }

    private upgradeSettingsToCurrentSchema(
        source: Record<string, unknown>,
        sourceVersion: number,
    ): Record<string, unknown> {
        // settings migrations go here

        // usually, additive changes do not need extra migration logic, and are
        // merged naturally. writing migrations should only be necessary when
        // the canonical schema is updated in an incompatible way

        if (sourceVersion === CURRENT_SETTINGS_VERSION)
            return deepMerge(DEFAULT_SETTINGS, source);

        return deepMerge(DEFAULT_SETTINGS, source);
    }

    private getSchemaVersion(source: Record<string, unknown>): number {
        const version = source.schemaVersion;
        if (version === undefined) return 0;

        if (
            typeof version !== "number" ||
            !Number.isInteger(version) ||
            version < 0
        ) {
            throw new Error(
                "settings.schemaVersion must be a non-negative integer",
            );
        }

        return version;
    }

    private getSettingsRecord(raw: unknown): Record<string, unknown> {
        if (!raw || typeof raw !== "object" || Array.isArray(raw))
            throw new Error("Settings file must contain a JSON object");

        return raw as Record<string, unknown>;
    }
}

export const settingsManager = new SettingsManager();

export async function initializeSettings(): Promise<Settings> {
    try {
        const settings = await settingsManager.load();
        settingsManager.startWatcher();
        return settings;
    } catch (err) {
        const message = getErrorMessage(err);
        const unsupportedVersion =
            err instanceof UnsupportedSettingsVersionError;

        let result = dialog.showMessageBoxSync({
            type: "error",
            title: product.name.short,
            message: unsupportedVersion
                ? "Unsupported settings file"
                : "Failed to load settings",
            detail: message,
            buttons: ["Reset to defaults", "Open settings file", "Quit"],
            defaultId: 0,
            cancelId: 2,
        });

        while (true) {
            switch (result) {
                case 0: {
                    const confirmReset = dialog.showMessageBoxSync({
                        type: "warning",
                        title: product.name.short,
                        message: "Reset to default settings?",
                        detail: "All of your settings will be lost, this can't be undone!",
                        buttons: ["Cancel", "Reset"],
                        noLink: true,
                        defaultId: 0,
                        cancelId: 0,
                    });

                    if (confirmReset === 1) {
                        await settingsManager.reset();
                        settingsManager.startWatcher();
                        return settingsManager.get();
                    }

                    result = dialog.showMessageBoxSync({
                        type: "error",
                        title: product.name.short,
                        message: unsupportedVersion
                            ? "Unsupported settings file"
                            : "Failed to load settings",
                        detail: message,
                        buttons: [
                            "Reset to defaults",
                            "Open settings file",
                            "Quit",
                        ],
                        defaultId: 0,
                        cancelId: 2,
                    });
                    break;
                }
                case 1:
                    await shell.openPath(SETTINGS_FILE);
                    process.exit(1);
                    break;
                case 2:
                    process.exit(1);
                    break;
            }
        }
    }
}
