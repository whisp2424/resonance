import type { MediaSource } from "@main/database/schema";
import type { ScanSourceResult } from "@shared/types/library";
import type { Result } from "@shared/types/result";

import { stat } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@main/database";
import { sourcesTable, tracksTable } from "@main/database/schema";
import { importer } from "@main/library/mediaImporter";
import { windowManager } from "@main/window/windowManager";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";
import { count, eq } from "drizzle-orm";
import PQueue from "p-queue";
import pc from "picocolors";
import { glob } from "tinyglobby";

const GLOB_PATTERN = "**/*.{mp3,flac,m4a,wav,ogg,opus}";

interface MediaDiff {
    added: Set<string>;
    removed: Set<string>;
    updated: Set<string>;
}

interface SourceState {
    diff: MediaDiff;
    errors: string[];
    running: boolean;
    cancelled: boolean;
    processed: number;
    total: number;
}

function newDiff(): MediaDiff {
    return { added: new Set(), removed: new Set(), updated: new Set() };
}

function mergeDiff(target: MediaDiff, incoming: MediaDiff) {
    for (const f of incoming.added) {
        target.removed.delete(f);
        target.updated.delete(f);
        target.added.add(f);
    }

    for (const f of incoming.updated)
        if (!target.added.has(f)) target.updated.add(f);

    for (const f of incoming.removed) {
        target.added.delete(f);
        target.updated.delete(f);
        target.removed.add(f);
    }
}

type GenerateDiffResult = Result<MediaDiff, "unknown">;

export class MediaScanner {
    private sourceState = new Map<number, SourceState>();
    private scansQueue = new PQueue({ concurrency: 2 });

    private async generateDiff(
        source: MediaSource,
    ): Promise<GenerateDiffResult> {
        try {
            const diff: MediaDiff = newDiff();

            const dbTracks = await db
                .select({
                    relativePath: tracksTable.relativePath,
                    modifiedAt: tracksTable.modifiedAt,
                })
                .from(tracksTable)
                .where(eq(tracksTable.sourceId, source.id));

            const dbTracksMap = new Map(
                dbTracks.map((t) => [t.relativePath, t]),
            );

            const files = await glob(GLOB_PATTERN, { cwd: source.path });
            const fileSet = new Set(files);

            for (const file of files) {
                const absolutePath = join(source.path, file);
                const stats = await stat(absolutePath);
                const mtime = Math.floor(stats.mtimeMs);

                const existingTrack = dbTracksMap.get(file);
                if (!existingTrack) {
                    diff.added.add(file);
                } else if (existingTrack.modifiedAt !== mtime) {
                    diff.updated.add(file);
                }
            }

            for (const track of dbTracks) {
                if (!fileSet.has(track.relativePath))
                    diff.removed.add(track.relativePath);
            }

            return ok(diff);
        } catch (err) {
            return error("unknown", getErrorMessage(err));
        }
    }

    async scan(sourceId: number): Promise<ScanSourceResult> {
        const dbSources = await db
            .select()
            .from(sourcesTable)
            .where(eq(sourcesTable.id, sourceId));

        const source = dbSources[0];
        if (!source) {
            windowManager.emitEvent("library:onScanEnd", sourceId);
            return error(
                "invalid_source",
                `Source ID ${sourceId} does not exist`,
            );
        }

        log(
            pc.dim(`scanning ${source.displayName} (${source.path})...`),
            "MediaScanner",
        );

        let state = this.sourceState.get(sourceId);

        if (!state) {
            state = {
                diff: newDiff(),
                errors: [],
                running: true,
                cancelled: false,
                processed: 0,
                total: 0,
            };
            this.sourceState.set(sourceId, state);
        } else {
            state.running = true;
            state.cancelled = false;
            state.processed = 0;
            state.total = 0;
        }

        windowManager.emitEvent("library:onScanStart", sourceId);

        const diffResult = await this.generateDiff(source);
        if (!diffResult.success) {
            windowManager.emitEvent("library:onScanEnd", sourceId);
            return error(diffResult.error, diffResult.message);
        }

        const diff = diffResult.data;
        const diffSummary = {
            added: diff.added.size,
            updated: diff.updated.size,
            removed: diff.removed.size,
            total: diff.added.size + diff.updated.size + diff.removed.size,
        };

        if (diffSummary.total === 0) {
            log(pc.dim(`${source.displayName} is up-to-date`), "MediaScanner");
            state.running = false;
            windowManager.emitEvent("library:onScanEnd", sourceId);
            return ok({ success: true, errors: [] });
        }

        log(
            pc.dim(`pending summary for ${source.displayName}: `) +
                `${pc.green(diffSummary.added)} new, ` +
                `${pc.cyan(diffSummary.updated)} updated, ` +
                `${pc.red(diffSummary.removed)} removed`,
            "MediaScanner",
        );

        mergeDiff(state.diff, diff);
        state.total = diffSummary.total;

        importer.resetCache();

        const processFiles = async (
            files: string[],
            operation: "add" | "update" | "remove",
        ): Promise<void> => {
            for (const file of files) {
                if (state.cancelled) return;

                try {
                    if (operation === "add") {
                        log(`${pc.green("+")} ${file}`, "MediaScanner");
                        await importer.importFile(sourceId, source.path, file);
                    } else if (operation === "update") {
                        log(`${pc.cyan("~")} ${file}`, "MediaScanner");
                        await importer.importFile(sourceId, source.path, file);
                    } else {
                        log(`${pc.red("-")} ${file}`, "MediaScanner");
                        await importer.removeFile(sourceId, file);
                    }
                } catch (err) {
                    const errorMsg =
                        operation === "add"
                            ? "import"
                            : operation === "update"
                              ? "update"
                              : "remove";
                    state.errors.push(
                        `${errorMsg} failed: ${getErrorMessage(err)}`,
                    );
                }

                state.processed++;
                await new Promise((resolve) => setImmediate(resolve));
            }
        };

        const job = this.scansQueue.add(async () => {
            const currentState = state;
            if (!currentState || currentState.cancelled) return;

            try {
                while (
                    currentState.diff.added.size ||
                    currentState.diff.updated.size ||
                    currentState.diff.removed.size
                ) {
                    if (currentState.cancelled) return;

                    const currentDiff = {
                        added: Array.from(currentState.diff.added),
                        updated: Array.from(currentState.diff.updated),
                        removed: Array.from(currentState.diff.removed),
                    };

                    currentState.diff = newDiff();

                    if (currentDiff.added.length > 0)
                        await processFiles(currentDiff.added, "add");

                    if (currentDiff.updated.length > 0)
                        await processFiles(currentDiff.updated, "update");

                    if (currentDiff.removed.length > 0)
                        await processFiles(currentDiff.removed, "remove");
                }
            } catch (err) {
                currentState.errors.push(getErrorMessage(err));
            } finally {
                currentState.running = false;

                const [{ value: fileCount }] = await db
                    .select({ value: count() })
                    .from(tracksTable)
                    .where(eq(tracksTable.sourceId, sourceId));

                await db
                    .update(sourcesTable)
                    .set({ lastUpdated: Date.now(), fileCount })
                    .where(eq(sourcesTable.id, sourceId));
                windowManager.emitEvent("library:onScanEnd", sourceId);
            }
        });

        await job;
        return ok({ success: true, errors: state.errors });
    }

    cancel(sourceId: number) {
        const state = this.sourceState.get(sourceId);
        if (state) {
            state.cancelled = true;
            state.running = false;
            windowManager.emitEvent("library:onScanEnd", sourceId);
        }
    }

    getProgress(): Map<number, { processed: number; total: number }> {
        const result = new Map<number, { processed: number; total: number }>();
        for (const [sourceId, state] of this.sourceState) {
            if (state.running)
                result.set(sourceId, {
                    processed: state.processed,
                    total: state.total,
                });
        }
        return result;
    }
}

export const scanner = new MediaScanner();
