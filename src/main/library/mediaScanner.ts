import type { MediaSource } from "@main/database/schema";
import type { ScanSourceResult } from "@shared/types/library";
import type { Result } from "@shared/types/result";

import { stat } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@main/database";
import { sourcesTable, tracksTable } from "@main/database/schema";
import { windowManager } from "@main/window/windowManager";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";
import { eq } from "drizzle-orm";
import PQueue from "p-queue";
import pc from "picocolors";
import { glob } from "tinyglobby";

const GLOB_PATTERN = "**/*.{mp3,flac,m4a,wav,ogg,opus}";
const BATCH_SIZE = 50;

interface MediaDiff {
    added: Set<string>;
    removed: Set<string>;
    updated: Set<string>;
}

interface SourceState {
    diff: MediaDiff;
    errors: string[];
    running: boolean;
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
                processed: 0,
                total: 0,
            };
            this.sourceState.set(sourceId, state);
        } else {
            state.running = true;
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
            log(
                pc.dim(`${pc.italic(source.displayName)} is up-to-date`),
                "MediaScanner",
            );

            state.running = false;
            windowManager.emitEvent("library:onScanEnd", sourceId);
            return ok({ success: true, errors: [] });
        }

        log(
            pc.dim(`${source.displayName} summary: `) +
                `${pc.green(diffSummary.added)} new, ` +
                `${pc.cyan(diffSummary.updated)} updated, ` +
                `${pc.red(diffSummary.removed)} removed`,
            "MediaScanner",
        );

        mergeDiff(state.diff, diff);
        state.total = diffSummary.total;

        const job = this.scansQueue.add(async () => {
            const currentState = state;
            const totalFiles = diffSummary.total;

            let processedFiles = 0;
            let lastProgressTimestamp = Date.now();

            function emitProgress() {
                const now = Date.now();
                if (now - lastProgressTimestamp >= 500) {
                    lastProgressTimestamp = now;
                    currentState.processed = processedFiles;
                    windowManager.emitEvent(
                        "library:onScanProgress",
                        sourceId,
                        processedFiles,
                        totalFiles,
                    );
                }
            }

            windowManager.emitEvent(
                "library:onScanProgress",
                sourceId,
                0,
                totalFiles,
            );

            try {
                while (
                    currentState.diff.added.size ||
                    currentState.diff.updated.size ||
                    currentState.diff.removed.size
                ) {
                    const currentDiff = {
                        added: Array.from(currentState.diff.added),
                        updated: Array.from(currentState.diff.updated),
                        removed: Array.from(currentState.diff.removed),
                    };

                    currentState.diff = newDiff();

                    for (
                        let i = 0;
                        i < currentDiff.added.length;
                        i += BATCH_SIZE
                    ) {
                        const batch = currentDiff.added.slice(
                            i,
                            i + BATCH_SIZE,
                        );

                        for (const file of batch) {
                            log(`${pc.green("+")} ${file}`, "MediaScanner");
                            // TODO: actual importing logic
                            processedFiles++;
                            emitProgress();
                        }

                        await new Promise((resolve) => setImmediate(resolve));
                    }

                    for (
                        let i = 0;
                        i < currentDiff.updated.length;
                        i += BATCH_SIZE
                    ) {
                        const batch = currentDiff.updated.slice(
                            i,
                            i + BATCH_SIZE,
                        );

                        for (const file of batch) {
                            log(`${pc.cyan("~")} ${file}`, "MediaScanner");
                            // TODO: actual importing logic
                            processedFiles++;
                            emitProgress();
                        }

                        await new Promise((resolve) => setImmediate(resolve));
                    }

                    for (
                        let i = 0;
                        i < currentDiff.removed.length;
                        i += BATCH_SIZE
                    ) {
                        const batch = currentDiff.removed.slice(
                            i,
                            i + BATCH_SIZE,
                        );

                        for (const file of batch) {
                            log(`${pc.red("-")} ${file}`, "MediaScanner");
                            // TODO: delete track from DB
                            processedFiles++;
                            emitProgress();
                        }

                        await new Promise((resolve) => setImmediate(resolve));
                    }
                }
            } catch (err) {
                currentState.errors.push(getErrorMessage(err));
            } finally {
                currentState.running = false;
                currentState.processed = 0;
                currentState.total = 0;
                await db
                    .update(sourcesTable)
                    .set({ lastUpdated: Date.now() })
                    .where(eq(sourcesTable.id, sourceId));
                windowManager.emitEvent("library:onScanEnd", sourceId);
            }
        });

        await job;
        return ok({ success: true, errors: state.errors });
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
