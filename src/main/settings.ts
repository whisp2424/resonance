import type { Settings } from "@shared/schema/settings";
import type { FSWatcher } from "chokidar";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { windowManager } from "@main/window/windowManager";
import { DEFAULT_SETTINGS, settingsSchema } from "@shared/schema/settings";
import { type } from "arktype";
import { watch } from "chokidar";
import { app, dialog, shell } from "electron";
import writeFile from "write-file-atomic";

import product from "@main/../../build/product.json" with { type: "json" };

const SETTINGS_FILE = join(app.getPath("userData"), "settings.json");

type SettingsKey = keyof Settings;

interface ListenerEntry {
    callback: (settings: Settings, key?: SettingsKey) => void;
    key?: SettingsKey;
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
        return () => {
            this.listeners.delete(entry);
        };
    }

    private emitChanges(settings: Settings, key?: SettingsKey): void {
        for (const entry of this.listeners) {
            if (entry.key === undefined || entry.key === key) {
                entry.callback(settings, key);
            }
        }
    }

    async load(): Promise<Settings> {
        let rawData: string;

        try {
            rawData = await readFile(SETTINGS_FILE, "utf-8");
        } catch {
            await this.write(DEFAULT_SETTINGS);
            this.settingsCache = DEFAULT_SETTINGS;
            return this.settingsCache;
        }

        try {
            const jsonData = JSON.parse(rawData);
            const settingsData = settingsSchema(jsonData);

            if (settingsData instanceof type.errors)
                throw new Error(settingsData.summary);

            this.settingsCache = settingsData;
            return this.settingsCache;
        } catch (error) {
            if (error instanceof SyntaxError) throw new Error(error.message);
            throw error;
        }
    }

    async write(newSettings: Settings): Promise<SettingsKey | undefined> {
        this.isWriting = true;
        let changedKey: SettingsKey | undefined;
        try {
            const oldSettings = this.settingsCache;
            await writeFile(
                SETTINGS_FILE,
                JSON.stringify(newSettings, null, 4),
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

    async update(partial: Partial<Settings>): Promise<SettingsKey | undefined> {
        const result = settingsSchema({
            ...this.get(),
            ...partial,
        });

        if (result instanceof type.errors) throw new Error(result.summary);
        return await this.write(result);
    }

    get(): Settings {
        if (!this.settingsCache)
            throw new Error("Settings not loaded. Call load() first.");
        return this.settingsCache;
    }

    initialize(): void {
        this.startWatcher();
    }

    private startWatcher(): void {
        if (this.fileWatcher) return;
        this.fileWatcher = watch(SETTINGS_FILE, { ignoreInitial: true });
        this.fileWatcher.on("change", () => {
            this.handleExternalChanges();
        });
    }

    private async handleExternalChanges(): Promise<void> {
        if (this.isWriting) return;

        try {
            const data = await readFile(SETTINGS_FILE, "utf-8");
            const parsed = JSON.parse(data);
            const result = settingsSchema(parsed);

            if (result instanceof type.errors) {
                windowManager.emitEvent("settings:onError", result.summary);
                return;
            }

            const oldSettings = this.settingsCache;
            this.settingsCache = result;
            let changedKey: SettingsKey | undefined;
            if (oldSettings) {
                for (const key of Object.keys(oldSettings) as SettingsKey[]) {
                    if (
                        JSON.stringify(oldSettings[key]) !==
                        JSON.stringify(result[key])
                    ) {
                        changedKey = key;
                        break;
                    }
                }
            }
            this.emitChanges(this.settingsCache, changedKey);
            windowManager.emitEvent("settings:onChanged", this.settingsCache);
        } catch (error) {
            if (error instanceof SyntaxError) {
                windowManager.emitEvent(
                    "settings:onError",
                    "External settings file is invalid JSON",
                );
            } else windowManager.emitEvent("settings:onError", error);
        }
    }

    async reset(): Promise<void> {
        this.isWriting = true;
        try {
            await writeFile(
                SETTINGS_FILE,
                JSON.stringify(DEFAULT_SETTINGS, null, 4),
                { encoding: "utf-8" },
            );
            this.settingsCache = DEFAULT_SETTINGS;
            this.emitChanges(this.settingsCache, undefined);
            windowManager.emitEvent("settings:onChanged", this.settingsCache);
        } finally {
            this.isWriting = false;
        }
    }

    dispose(): void {
        this.fileWatcher?.close();
        this.fileWatcher = null;
    }
}

export const settingsManager = new SettingsManager();
export async function initializeSettings(): Promise<Settings> {
    try {
        const settings = await settingsManager.load();
        settingsManager.initialize();
        return settings;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        let result = dialog.showMessageBoxSync({
            type: "error",
            title: product.name.short,
            message: "Failed to load settings",
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
                        settingsManager.initialize();
                        return settingsManager.get();
                    }

                    result = dialog.showMessageBoxSync({
                        type: "error",
                        title: product.name.short,
                        message: "Failed to load settings",
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
