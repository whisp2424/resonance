import type { FSWatcher } from "chokidar";

import { platform } from "@electron-toolkit/utils";
import { db } from "@main/database";
import { scanner } from "@main/library/mediaScanner";
import { sourcesTable } from "@shared/database/schema";
import { log } from "@shared/utils/logger";
import { watch } from "chokidar";
import pc from "picocolors";

const DEBOUNCE_MS = 1000;
const USE_POLLING = platform.isWindows;

class SourceWatcher {
    private watchers = new Map<number, FSWatcher>();
    private debounceTimers = new Map<number, NodeJS.Timeout>();

    async watch(sourceId: number, sourcePath: string): Promise<void> {
        if (this.watchers.has(sourceId)) return;

        const watcher = watch(sourcePath, {
            persistent: true,
            ignoreInitial: true,
            usePolling: USE_POLLING,
        });

        watcher.on("add", () => this.onFileChange(sourceId));
        watcher.on("change", () => this.onFileChange(sourceId));
        watcher.on("unlink", () => this.onFileChange(sourceId));

        this.watchers.set(sourceId, watcher);
        log(pc.dim(`watching ${sourcePath}`), "SourceWatcher");
    }

    unwatch(sourceId: number): void {
        const watcher = this.watchers.get(sourceId);
        if (watcher) {
            watcher.close();
            this.watchers.delete(sourceId);
        }

        const timer = this.debounceTimers.get(sourceId);
        if (timer) {
            clearTimeout(timer);
            this.debounceTimers.delete(sourceId);
        }
    }

    async loadAll(): Promise<void> {
        const sources = await db.select().from(sourcesTable);
        for (const source of sources) await this.watch(source.id, source.path);

        log(
            pc.dim(`watching ${sources.length} media sources`),
            "SourceWatcher",
        );
    }

    dispose(): void {
        for (const [sourceId] of this.watchers) this.unwatch(sourceId);
    }

    private onFileChange(sourceId: number): void {
        const existingTimer = this.debounceTimers.get(sourceId);
        if (existingTimer) clearTimeout(existingTimer);

        const timer = setTimeout(async () => {
            this.debounceTimers.delete(sourceId);
            scanner.scan(sourceId);
        }, DEBOUNCE_MS);

        this.debounceTimers.set(sourceId, timer);
    }
}

export const watcher = new SourceWatcher();
