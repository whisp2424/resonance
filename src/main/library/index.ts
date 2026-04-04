import type {
    Album,
    AlbumArtist,
    Artist,
    Disc,
    Genre,
    MediaSource,
    Track,
} from "@shared/database/schema";
import type {
    AddSourceResult,
    GetSourcesResult,
    GetTrackResult,
    GetTracksResult,
    RemoveSourceResult,
    TrackResult,
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
    genresTable,
    sourcesTable,
    trackGenresTable,
    tracksTable,
} from "@shared/database/schema";
import { error, ok } from "@shared/types/result";
import { getErrorMessage } from "@shared/utils/logger";
import { eq, inArray } from "drizzle-orm";

const trackJoin = {
    track: tracksTable,
    source: sourcesTable,
    artist: artistsTable,
    album: albumsTable,
    albumArtist: albumArtistsTable,
    disc: discsTable,
};

function toTrackResult(row: {
    track: Track;
    source: MediaSource;
    artist: Artist;
    album: Album;
    albumArtist: AlbumArtist;
    disc: Disc;
    genres: Genre[];
}): TrackResult {
    return {
        absolutePath: join(row.source.path, row.track.relativePath),
        track: row.track,
        source: row.source,
        artist: row.artist,
        album: row.album,
        albumArtist: row.albumArtist,
        disc: row.disc,
        genres: row.genres,
    };
}

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
                .select(trackJoin)
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

            const genresMap = await this.fetchGenresForTracks([trackId]);
            return ok(
                toTrackResult({
                    ...result[0],
                    genres: genresMap.get(trackId) ?? [],
                }),
            );
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    async getTracks(ids: number[]): Promise<GetTracksResult> {
        if (ids.length === 0) return { tracks: [], errors: [] };

        try {
            const rows = await db
                .select(trackJoin)
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
                .where(inArray(tracksTable.id, ids));

            const found = new Map(rows.map((r) => [r.track.id, r]));
            const genresMap = await this.fetchGenresForTracks(
                rows.map((r) => r.track.id),
            );

            const tracks: TrackResult[] = [];
            const errors: { trackId: number; error: string }[] = [];

            for (const id of ids) {
                const row = found.get(id);
                if (row) {
                    tracks.push(
                        toTrackResult({
                            ...row,
                            genres: genresMap.get(id) ?? [],
                        }),
                    );
                } else {
                    errors.push({
                        trackId: id,
                        error: `Track ID ${id} not found`,
                    });
                }
            }

            return { tracks, errors };
        } catch (err) {
            const message = getErrorMessage(err);
            return {
                tracks: [],
                errors: ids.map((id) => ({ trackId: id, error: message })),
            };
        }
    }

    private async fetchGenresForTracks(
        trackIds: number[],
    ): Promise<Map<number, Genre[]>> {
        if (trackIds.length === 0) return new Map();

        const rows = await db
            .select({
                trackId: trackGenresTable.trackId,
                genre: genresTable,
            })
            .from(trackGenresTable)
            .innerJoin(
                genresTable,
                eq(trackGenresTable.genreId, genresTable.id),
            )
            .where(inArray(trackGenresTable.trackId, trackIds));

        const map = new Map<number, Genre[]>();
        for (const { trackId, genre } of rows) {
            const existing = map.get(trackId);
            if (existing) existing.push(genre);
            else map.set(trackId, [genre]);
        }

        return map;
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
