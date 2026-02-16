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
            return error(
                "invalid_source",
                `Source ID ${sourceId} does not exist`,
            );
        }

        log(
            pc.dim(`scanning ${source.displayName} (${source.path})...`),
            "MediaScanner",
        );

        const diffResult = await this.generateDiff(source);
        if (!diffResult.success)
            return error(diffResult.error, diffResult.message);

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
            return ok({ success: true, errors: [] });
        }

        log(
            pc.dim(`${pc.italic(source.displayName)} summary: `) +
                `${pc.green(diffSummary.added)} new, ` +
                `${pc.cyan(diffSummary.updated)} updated, ` +
                `${pc.red(diffSummary.removed)} removed`,
            "MediaScanner",
        );

        let state = this.sourceState.get(sourceId);

        if (!state) {
            state = { diff: newDiff(), errors: [], running: false };
            this.sourceState.set(sourceId, state);
        }

        mergeDiff(state.diff, diff);

        if (state.running) {
            log(
                pc.dim(
                    `a scan is already running for ${pc.italic(source.displayName)}, changes will be pushed to the existing queue`,
                ),
                "MediaScanner",
            );
            return ok({ success: true, errors: state.errors });
        }

        state.running = true;
        const job = this.scansQueue.add(async () => {
            try {
                while (
                    state.diff.added.size ||
                    state.diff.updated.size ||
                    state.diff.removed.size
                ) {
                    const currentDiff = {
                        added: new Set(state.diff.added),
                        updated: new Set(state.diff.updated),
                        removed: new Set(state.diff.removed),
                    };

                    state.diff = newDiff();

                    for (const file of currentDiff.added) {
                        log(`${pc.green("+")} ${file}`, "MediaScanner");
                        // TODO: call reconcileFile(sourceId, file)
                    }

                    for (const file of currentDiff.updated) {
                        log(`${pc.cyan("~")} ${file}`, "MediaScanner");
                        // TODO: call reconcileFile(sourceId, file)
                    }

                    for (const file of currentDiff.removed) {
                        log(`${pc.red("-")} ${file}`, "MediaScanner");
                        // TODO: delete track from DB
                    }
                }
            } catch (err) {
                state.errors.push(getErrorMessage(err));
            } finally {
                state.running = false;
            }
        });

        await job;
        return ok({ success: true, errors: state.errors });
    }
}

export const scanner = new MediaScanner();
