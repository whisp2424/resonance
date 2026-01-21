import { readFileSync } from "node:fs";
import { join } from "node:path";

import chokidar from "chokidar";
import { app } from "electron";
import writeFileAtomic from "write-file-atomic";

export interface StoreOptions<T> {
    filename: string;
    defaults: T;
    watch?: (data: T, diff: Partial<T>) => void;
    encode: (data: T) => string;
    decode: (data: unknown) => T;
}

export class Store<T> {
    private filePath: string;
    private data: T;
    private defaults: T;
    private watcher: ReturnType<typeof chokidar.watch> | null = null;
    private watchCallback: ((data: T, diff: Partial<T>) => void) | null = null;
    private encodeFn: (data: T) => string;
    private decodeFn: (data: unknown) => T;
    private writeInProgress: boolean = false;
    private pendingWrites: Map<keyof T, unknown> = new Map();

    constructor(options: StoreOptions<T>) {
        this.filePath = join(app.getPath("userData"), options.filename);
        this.defaults = options.defaults;
        this.encodeFn = options.encode;
        this.decodeFn = options.decode;
        this.watchCallback = options.watch ?? null;
        this.data = this.load();
        this.startWatching();
    }

    private load(): T {
        try {
            const result = this.loadFromDisk();
            if (result !== null) {
                return result;
            }
        } catch {}
        return structuredClone(this.defaults);
    }

    private loadFromDisk(): T | null {
        try {
            const result = readFileSync(this.filePath, "utf-8");
            if (!result || result.trim() === "") {
                return null;
            }

            const parsed = JSON.parse(result);

            if (
                typeof parsed !== "object" ||
                parsed === null ||
                Array.isArray(parsed)
            ) {
                return null;
            }

            return this.decodeFn(parsed);
        } catch {
            return null;
        }
    }

    private startWatching(): void {
        if (this.watchCallback === null) return;

        try {
            this.watcher = chokidar.watch(this.filePath, {
                ignoreInitial: true,
            });

            this.watcher.on("change", () => {
                const oldData = structuredClone(this.data);
                const newData = this.load();

                const changedKeys: Partial<T> = {};
                const keys = Object.keys(newData as object) as Array<keyof T>;

                for (const key of keys) {
                    if (
                        JSON.stringify(oldData[key]) !==
                        JSON.stringify(newData[key as keyof T])
                    ) {
                        changedKeys[key] = newData[key as keyof T];
                    }
                }

                this.data = newData;

                if (Object.keys(changedKeys).length > 0) {
                    this.watchCallback?.(this.data, changedKeys);
                }
            });
        } catch {}
    }

    get store(): T {
        return this.data;
    }

    get<K extends keyof T>(key: K): T[K] | undefined {
        return this.data[key];
    }

    set<K extends keyof T>(key: K, value: T[K]): void {
        this.pendingWrites.set(key, value);
        this.flush();
    }

    private flush(): void {
        if (this.writeInProgress) return;
        if (this.pendingWrites.size === 0) return;

        this.writeInProgress = true;

        const updates = structuredClone(this.pendingWrites);
        this.pendingWrites.clear();

        const newData = { ...this.data, ...updates };
        this.data = newData;

        const content = this.encodeFn(newData);

        writeFileAtomic(this.filePath, content, "utf-8", () => {
            this.writeInProgress = false;

            if (this.pendingWrites.size > 0) {
                this.flush();
            }
        });
    }

    onDidChange<K extends keyof T>(
        key: K,
        callback: (value: T[K], oldValue: T[K]) => void,
    ): () => void {
        if (this.watchCallback === null) {
            return () => {};
        }

        let previousValue = this.data[key];

        const wrappedCallback = (_data: T, diff: Partial<T>) => {
            if (key in diff) {
                const newValue = _data[key];
                if (previousValue !== newValue) {
                    callback(newValue as T[K], previousValue as T[K]);
                    previousValue = newValue as T[K];
                }
            }
        };

        const listeners: Array<(data: T, diff: Partial<T>) => void> = [];

        listeners.push(wrappedCallback);

        const originalCallback = this.watchCallback;

        const combinedCallback = (_data: T, diff: Partial<T>) => {
            originalCallback(_data, diff);
            for (const listener of listeners) {
                listener(_data, diff);
            }
        };

        this.watchCallback = combinedCallback;

        const removeListener = () => {
            const index = listeners.indexOf(wrappedCallback);
            if (index !== -1) {
                listeners.splice(index, 1);
            }

            if (listeners.length === 0 && originalCallback === null) {
                this.watchCallback = null;
                this.watcher?.close();
                this.watcher = null;
            } else if (listeners.length === 0) {
                this.watchCallback = originalCallback;
            }
        };

        return removeListener;
    }

    destroy(): void {
        this.watcher?.close();
        this.watcher = null;
        this.watchCallback = null;
    }
}

export function createStore<T extends Record<string, unknown>>(
    options: StoreOptions<T>,
): Store<T> {
    return new Store(options);
}
