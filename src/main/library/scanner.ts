import type { MediaSource } from "@main/database/schema";
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

interface ScanDiff {
    added: Set<string>;
    removed: Set<string>;
    updated: Set<string>;
}

type GetDiffResult = Result<ScanDiff, "unknown">;
type ScanResult = Result<true, "invalid_source" | "unknown">;

class MediaScanner {
    private activeSources = new Set<number>();
    private activeJobs = new pQueue({ concurrency: 2 });
    private pendingFiles = new Map<number, ScanDiff>();

    /**
     * Returns the set of files that have been added, removed, or modified since
     * the last scan for the given source.
     */
    private async getDiff(source: MediaSource): Promise<GetDiffResult> {
        try {
            const diff: ScanDiff = {
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

    async scan(sourceId: number): Promise<ScanResult> {
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

        log(pc.dim(`scanning ${source.displayName}...`), "MediaScanner");

        const diff = await this.getDiff(source);
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
                pc.dim(`media source ${source.displayName} is up-to-date`),
                "MediaScanner",
            );
            return ok(true);
        }

        log(
            pc.dim("pending changes: ") +
                `${pc.green(diffSummary.added)} new, ` +
                `${pc.cyan(diffSummary.updated)} updated, ` +
                `${pc.red(diffSummary.removed)} removed`,
            "MediaScanner",
        );

        const pendingFiles = this.pendingFiles.get(sourceId);

        if (!pendingFiles) {
            this.pendingFiles.set(sourceId, diff.data);
        } else {
            for (const f of diff.data.added) {
                pendingFiles.removed.delete(f);
                pendingFiles.updated.delete(f);
                pendingFiles.added.add(f);
            }

            for (const f of diff.data.updated) {
                if (!pendingFiles.added.has(f)) {
                    pendingFiles.updated.add(f);
                }
            }

            for (const f of diff.data.removed) {
                pendingFiles.added.delete(f);
                pendingFiles.updated.delete(f);
                pendingFiles.removed.add(f);
            }
        }

        if (!this.activeSources.has(sourceId)) {
            this.activeSources.add(sourceId);
            this.activeJobs.add(async () => {
                try {
                    log(
                        pc.dim(`processing ${diffSummary.total} files...`),
                        "MediaScanner",
                    );

                    while (true) {
                        const pending = this.pendingFiles.get(sourceId);
                        if (!pending) break;

                        this.pendingFiles.delete(sourceId);

                        for (const file of pending.added) {
                            log(`${pc.green("+")} ${file}`, "MediaScanner");
                        }
                        for (const file of pending.updated) {
                            log(`${pc.cyan("~")} ${file}`, "MediaScanner");
                        }
                        for (const file of pending.removed) {
                            log(`${pc.red("-")} ${file}`, "MediaScanner");
                        }
                    }
                } finally {
                    this.activeSources.delete(sourceId);
                    this.pendingFiles.delete(sourceId);
                }
            });
        } else {
            log(
                pc.dim(
                    `a processing job for ${source.displayName} is already running, queueing changes...`,
                ),
                "MediaScanner",
            );
        }

        return ok(true);
    }
}

export const scanner = new MediaScanner();
