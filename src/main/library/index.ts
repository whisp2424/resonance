import type {
    AddSourceResult,
    GetSourcesResult,
    GetTrackResult,
    RemoveSourceResult,
} from "@shared/types/library";

import path, { join } from "node:path";

import { db } from "@main/database";
import { scanner } from "@main/library/MediaScanner";
import { watcher } from "@main/library/SourceWatcher";
import { validatePath } from "@main/utils/fs";
import {
    albumArtistsTable,
    albumsTable,
    artistsTable,
    discsTable,
    sourcesTable,
    tracksTable,
} from "@shared/database/schema";
import { error, ok } from "@shared/types/result";
import { getErrorMessage } from "@shared/utils/logger";
import { eq } from "drizzle-orm";

class LibraryManager {
    async getSources(): Promise<GetSourcesResult> {
        try {
            const sources = await db.select().from(sourcesTable);
            return ok(sources);
        } catch {
            return error(
                "An unknown error occurred while fetching media sources",
            );
        }
    }

    async addSource(
        sourcePath: string,
        name?: string,
    ): Promise<AddSourceResult> {
        try {
            // trim whitespace and strip surrounding quotes from user input
            sourcePath = sourcePath.trim().replace(/^["']|["']$/g, "");

            const validationResult = await validatePath(sourcePath);
            if (!validationResult.success) {
                const errorCode =
                    validationResult.error === "unknown"
                        ? "unknown"
                        : "invalid_source";
                return error(validationResult.message, errorCode);
            }

            const normalizedPath = validationResult.data;
            const displayName =
                name || path.basename(normalizedPath).trim() || normalizedPath;

            const result = await db
                .insert(sourcesTable)
                .values({
                    displayName,
                    path: normalizedPath,
                    lastUpdated: Date.now(),
                })
                .onConflictDoNothing()
                .returning();

            if (result.length === 0) {
                return error(
                    "This media source has already been added to your library",
                    "duplicate_source",
                );
            }

            const source = result[0];
            await watcher.watch(source.id, source.path);
            scanner.scan(source.id);
            return ok({ source });
        } catch {
            return error("An unknown error occurred while adding the source");
        }
    }

    async removeSource(sourceId: number): Promise<RemoveSourceResult> {
        try {
            watcher.unwatch(sourceId);

            const result = await db
                .delete(sourcesTable)
                .where(eq(sourcesTable.id, sourceId))
                .returning({ id: sourcesTable.id });

            if (result.length === 0) {
                return error(
                    `Source ID ${sourceId} does not exist`,
                    "not_found",
                );
            }

            return ok(undefined);
        } catch {
            return error("An unknown error occurred while removing the source");
        }
    }

    async getTrack(trackId: number): Promise<GetTrackResult> {
        try {
            const result = await db
                .select({
                    track: tracksTable,
                    source: sourcesTable,
                    artist: artistsTable,
                    album: albumsTable,
                    albumArtist: albumArtistsTable,
                    disc: discsTable,
                })
                .from(tracksTable)
                .innerJoin(
                    sourcesTable,
                    eq(tracksTable.sourceId, sourcesTable.id),
                )
                .innerJoin(
                    artistsTable,
                    eq(tracksTable.artistId, artistsTable.id),
                )
                .innerJoin(albumsTable, eq(tracksTable.albumId, albumsTable.id))
                .innerJoin(
                    albumArtistsTable,
                    eq(albumsTable.albumArtistId, albumArtistsTable.id),
                )
                .innerJoin(discsTable, eq(tracksTable.discId, discsTable.id))
                .where(eq(tracksTable.id, trackId))
                .limit(1);

            if (result.length === 0)
                return error(`Track ID ${trackId} not found`, "not_found");

            const { track, source, artist, album, albumArtist, disc } =
                result[0];

            const absolutePath = join(source.path, track.relativePath);

            return ok({
                absolutePath,
                track,
                source,
                artist,
                album,
                albumArtist,
                disc,
            });
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    async scanAll(): Promise<void> {
        const sources = await db.select().from(sourcesTable);
        for (const source of sources) scanner.scan(source.id);
    }

    async watch(): Promise<void> {
        await this.scanAll();
        await watcher.loadAll();
    }

    unwatch(): void {
        watcher.dispose();
    }
}

export const library = new LibraryManager();
