import type { ParsedTrack } from "@main/library/mediaImporter";
import type { MediaSource } from "@shared/database/schema";
import type { ScanSourceResult } from "@shared/types/library";
import type { Result } from "@shared/types/result";

import { stat } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@main/database";
import { importer } from "@main/library/mediaImporter";
import { windowManager } from "@main/window/windowManager";
import { sourcesTable, tracksTable } from "@shared/database/schema";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";
import { count, eq } from "drizzle-orm";
import PQueue from "p-queue";
import pc from "picocolors";
import { glob } from "tinyglobby";

const GLOB_PATTERN = "**/*.{mp3,flac,m4a,wav,ogg,opus}";
const BATCH_SIZE = 50;
const PARSE_CONCURRENCY = 10;

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
    return {
        added: new Set(),
        removed: new Set(),
        updated: new Set(),
    };
}

function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
}

function mergeDiff(target: MediaDiff, incoming: MediaDiff) {
    for (const file of incoming.added) {
        target.removed.delete(file);
        target.updated.delete(file);
        target.added.add(file);
    }

    for (const file of incoming.updated)
        if (!target.added.has(file)) target.updated.add(file);

    for (const file of incoming.removed) {
        target.added.delete(file);
        target.updated.delete(file);
        target.removed.add(file);
    }
}

type GenerateDiffResult = Result<MediaDiff>;

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

            for (const track of dbTracks) {
                if (!fileSet.has(track.relativePath))
                    diff.removed.add(track.relativePath);
            }

            const statQueue = new PQueue({ concurrency: 50 });
            const fileStats = await Promise.all(
                files.map((file) =>
                    statQueue.add(async () => {
                        const absolutePath = join(source.path, file);
                        const stats = await stat(absolutePath);
                        return { file, mtime: Math.floor(stats.mtimeMs) };
                    }),
                ),
            );

            for (const { file, mtime } of fileStats) {
                if (file === undefined || mtime === undefined) continue;
                const existingTrack = dbTracksMap.get(file);
                if (!existingTrack) {
                    diff.added.add(file);
                } else if (existingTrack.modifiedAt !== mtime) {
                    diff.updated.add(file);
                }
            }

            return ok(diff);
        } catch (err) {
            return error(getErrorMessage(err));
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
                `Source ID ${sourceId} does not exist`,
                "invalid_source",
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
                running: false,
                cancelled: false,
                processed: 0,
                total: 0,
            };
            this.sourceState.set(sourceId, state);
        }

        windowManager.emitEvent("library:onScanStart", sourceId);

        const diffResult = await this.generateDiff(source);
        if (!diffResult.success) {
            windowManager.emitEvent("library:onScanEnd", sourceId);
            return error(diffResult.message, diffResult.error);
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
            await db
                .update(sourcesTable)
                .set({ lastUpdated: Date.now() })
                .where(eq(sourcesTable.id, sourceId));
            windowManager.emitEvent("library:onScanEnd", sourceId);
            return ok({ success: true, errors: [] });
        }

        log(
            pc.dim(`detected changes for ${source.displayName}: `) +
                `${pc.green(diffSummary.added)} new, ` +
                `${pc.cyan(diffSummary.updated)} updated, ` +
                `${pc.red(diffSummary.removed)} removed`,
            "MediaScanner",
        );

        mergeDiff(state.diff, diff);
        state.total = diffSummary.total;
        if (state.running) return ok({ success: true, errors: [] });

        state.running = true;
        state.cancelled = false;
        state.processed = 0;
        importer.resetCache();

        const fileProcessingQueue = new PQueue({
            concurrency: PARSE_CONCURRENCY,
        });

        /**
         * Given an array of file paths, parses the track metadata for each,
         * and stores any errors that occur.
         */
        const parseFiles = async (files: string[]): Promise<ParsedTrack[]> => {
            const parsedResults = await Promise.all(
                files.map((file) =>
                    fileProcessingQueue.add(async () => {
                        const result = await importer.parseMetadata(
                            source.path,
                            file,
                        );

                        return { file, result };
                    }),
                ),
            );

            const parsedTracks: ParsedTrack[] = [];

            for (const { result } of parsedResults) {
                if (!result.success) {
                    state.errors.push(result.message);
                } else {
                    parsedTracks.push(result.data);
                }
            }

            return parsedTracks;
        };

        /**
         * Parses and imports a batch of files into the database, storing any
         * errors that occur.
         */
        const importFiles = async (files: string[]): Promise<void> => {
            const parsed = await parseFiles(files);
            if (parsed.length === 0) return;

            const batchResult = await importer.importFiles(sourceId, parsed);

            if (!batchResult.success) {
                state.errors.push(batchResult.message);
                return;
            }

            for (const file of batchResult.data.failed)
                state.errors.push(`db insert failed for ${file}`);
        };

        /**
         * Processes a list of files in fixed-size batches for a given
         * operation.
         *
         * - `"add"` / `"update"` parses and imports files in the database.
         * - `"remove"` will delete files from the database without parsing.
         */
        const processFiles = async (
            files: string[],
            operation: "add" | "update" | "remove",
        ): Promise<void> => {
            for (let i = 0; i < files.length; i += BATCH_SIZE) {
                if (state.cancelled) return;
                const batch = files.slice(i, i + BATCH_SIZE);

                if (operation === "remove") {
                    const removeResult = importer.removeFiles(sourceId, batch);
                    if (!removeResult.success)
                        state.errors.push(removeResult.message);
                } else {
                    await importFiles(batch);
                }

                state.processed += batch.length;
            }
        };

        const job = this.scansQueue.add(async () => {
            const currentState = state;
            if (!currentState || currentState.cancelled) return;

            const startTime = Date.now();

            try {
                while (
                    currentState.diff.added.size ||
                    currentState.diff.updated.size ||
                    currentState.diff.removed.size
                ) {
                    if (currentState.cancelled) return;

                    const removed = Array.from(currentState.diff.removed);
                    currentState.diff.removed.clear();
                    if (removed.length > 0) {
                        await processFiles(removed, "remove");
                        continue;
                    }

                    if (currentState.diff.added.size > 0) {
                        const addedBatch = Array.from(
                            currentState.diff.added,
                        ).slice(0, BATCH_SIZE);
                        for (const file of addedBatch)
                            currentState.diff.added.delete(file);
                        await processFiles(addedBatch, "add");
                        continue;
                    }

                    if (currentState.diff.updated.size > 0) {
                        const updatedBatch = Array.from(
                            currentState.diff.updated,
                        ).slice(0, BATCH_SIZE);
                        for (const file of updatedBatch)
                            currentState.diff.updated.delete(file);
                        await processFiles(updatedBatch, "update");
                    }
                }
            } catch (err) {
                currentState.errors.push(getErrorMessage(err));
            } finally {
                currentState.running = false;

                if (currentState.cancelled) {
                    log(
                        `scan cancelled for ${source.displayName} ` +
                            pc.dim(`(${source.path})`),
                        "MediaScanner",
                    );
                } else {
                    const duration = formatDuration(Date.now() - startTime);
                    log(
                        `scan finished for ${source.displayName}: ` +
                            `${pc.cyan(state.total)} files processed ` +
                            pc.dim(`took ${duration}`),
                        "MediaScanner",
                    );
                }

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
            if (state.running) {
                result.set(sourceId, {
                    processed: state.processed,
                    total: state.total,
                });
            }
        }
        return result;
    }
}

export const scanner = new MediaScanner();
