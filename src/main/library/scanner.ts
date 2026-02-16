import type { MediaSource } from "@main/database/schema";
import type { ScanSourceResult } from "@shared/types/library";
import type { Result } from "@shared/types/result";

import { stat } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@main/database";
import { sourcesTable, tracksTable } from "@main/database/schema";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";
import { eq } from "drizzle-orm";
import pQueue from "p-queue";
import pc from "picocolors";
import { glob } from "tinyglobby";

const GLOB_PATTERN = "**/*.{mp3,flac,m4a,wav,ogg,opus}";

interface MediaDiff {
    added: Set<string>;
    removed: Set<string>;
    updated: Set<string>;
}

type GenerateDiffResult = Result<MediaDiff, "unknown">;

interface SourceState {
    diff: MediaDiff;
    errors: string[];
    job?: Promise<void>;
}

class MediaScanner {
    private sourceState = new Map<number, SourceState>();

    /**
     * A p-queue instance that enqueues at most two scan jobs per-source, that
     * can be ran in parallel.
     */
    private scansQueue = new pQueue({ concurrency: 2 });

    /**
     * Returns the set of files that have been added, removed, or modified since
     * the last scan for the given source.
     */
    private async generateDiff(
        source: MediaSource,
    ): Promise<GenerateDiffResult> {
        try {
            const diff: MediaDiff = {
                added: new Set(),
                removed: new Set(),
                updated: new Set(),
            };

            const dbTracks = await db
                .select({
                    relativePath: tracksTable.relativePath,
                    modifiedAt: tracksTable.modifiedAt,
                })
                .from(tracksTable)
                .where(eq(tracksTable.sourceId, source.id));

            const dbTracksMap = new Map(
                dbTracks.map((track) => [track.relativePath, track]),
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
                    continue;
                }

                if (existingTrack.modifiedAt !== mtime) {
                    diff.updated.add(file);
                }
            }

            for (const track of dbTracks) {
                if (!fileSet.has(track.relativePath)) {
                    diff.removed.add(track.relativePath);
                }
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
            return error(
                "invalid_source",
                `Source ID ${sourceId} does not exist`,
            );
        }

        log(
            pc.dim(`scanning ${source.displayName} (${source.path})...`),
            "MediaScanner",
        );

        const diff = await this.generateDiff(source);
        const diffSummary = { added: 0, removed: 0, updated: 0, total: 0 };
        if (!diff.success) return error(diff.error, diff.message);

        diffSummary.added = diff.data.added.size;
        diffSummary.updated = diff.data.updated.size;
        diffSummary.removed = diff.data.removed.size;
        diffSummary.total =
            diffSummary.added + diffSummary.updated + diffSummary.removed;

        if (
            diffSummary.added === 0 &&
            diffSummary.updated === 0 &&
            diffSummary.removed === 0
        ) {
            log(
                pc.dim(`${pc.italic(source.displayName)} is up-to-date`),
                "MediaScanner",
            );
            return ok({ success: true, errors: [] });
        }

        log(
            pc.dim(`${pc.italic(source.displayName)} summary: `) +
                `${pc.green(diffSummary.added)} new, ` +
                `${pc.cyan(diffSummary.updated)} updated, ` +
                `${pc.red(diffSummary.removed)} removed`,
            "MediaScanner",
        );

        const sourceState = this.sourceState.get(sourceId);

        if (!sourceState) {
            this.sourceState.set(sourceId, { diff: diff.data, errors: [] });
        } else {
            for (const f of diff.data.added) {
                sourceState.diff.removed.delete(f);
                sourceState.diff.updated.delete(f);
                sourceState.diff.added.add(f);
            }

            for (const f of diff.data.updated) {
                if (!sourceState.diff.added.has(f)) {
                    sourceState.diff.updated.add(f);
                }
            }

            for (const f of diff.data.removed) {
                sourceState.diff.added.delete(f);
                sourceState.diff.updated.delete(f);
                sourceState.diff.removed.add(f);
            }
        }

        if (!this.sourceState.get(sourceId)?.job) {
            const scanJob = this.scansQueue.add(async () => {
                try {
                    log(
                        pc.dim(`processing ${diffSummary.total} files...`),
                        "MediaScanner",
                    );

                    while (true) {
                        const state = this.sourceState.get(sourceId);
                        if (!state?.job) break;

                        this.sourceState.delete(sourceId);

                        for (const file of state.diff.added) {
                            log(`${pc.green("+")} ${file}`, "MediaScanner");
                        }
                        for (const file of state.diff.updated) {
                            log(`${pc.cyan("~")} ${file}`, "MediaScanner");
                        }
                        for (const file of state.diff.removed) {
                            log(`${pc.red("-")} ${file}`, "MediaScanner");
                        }
                    }
                } catch (err) {
                    const state = this.sourceState.get(sourceId);
                    if (state) state.errors.push(getErrorMessage(err));
                } finally {
                    this.sourceState.delete(sourceId);
                }
            });

            const existingState = this.sourceState.get(sourceId);
            if (existingState) existingState.job = scanJob;
        } else {
            log(
                pc.dim(
                    `a processing job for ${pc.italic(source.displayName)} is already running, queueing changes...`,
                ),
                "MediaScanner",
            );
        }

        const currentState = this.sourceState.get(sourceId);
        if (currentState?.job) {
            await currentState.job;
            this.sourceState.delete(sourceId);
        }

        const errors = this.sourceState.get(sourceId)?.errors ?? [];
        this.sourceState.delete(sourceId);
        return ok({ success: true, errors });
    }
}

export const scanner = new MediaScanner();
