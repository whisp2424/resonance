import type {
    NewAlbum,
    NewAlbumArtist,
    NewArtist,
    NewDisc,
    NewTrack,
} from "@main/database/schema";
import type { IAudioMetadata } from "music-metadata";

import { stat } from "node:fs/promises";
import { join } from "node:path";

import { db } from "@main/database";
import {
    albumArtistsTable,
    albumsTable,
    artistsTable,
    discsTable,
    tracksTable,
} from "@main/database/schema";
import { getErrorMessage, log } from "@shared/utils/logger";
import { eq, sql } from "drizzle-orm";
import { parseFile } from "music-metadata";

interface ImportCache {
    artists: Map<string, number>;
    albumArtists: Map<string, number>;
    albums: Map<string, number>;
    discs: Map<string, number>;
}

function createCache(): ImportCache {
    return {
        artists: new Map(),
        albumArtists: new Map(),
        albums: new Map(),
        discs: new Map(),
    };
}

export class MediaImporter {
    private cache: ImportCache = createCache();

    resetCache(): void {
        this.cache = createCache();
    }

    async importFile(
        sourceId: number,
        sourcePath: string,
        file: string,
    ): Promise<boolean> {
        const absolutePath = join(sourcePath, file);

        try {
            const [metadata, stats] = await Promise.all([
                parseFile(absolutePath),
                stat(absolutePath),
            ]);

            const mtime = Math.floor(stats.mtimeMs);
            await this.saveTrack(sourceId, file, metadata, mtime);
            return true;
        } catch (err) {
            log(
                `failed to import ${file}: ${getErrorMessage(err)}`,
                "MediaImporter",
                "error",
            );
            return false;
        }
    }

    private async getOrCreateArtist(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        name: string,
        sortName: string | undefined,
    ): Promise<number> {
        const cached = this.cache.artists.get(name);
        if (cached !== undefined) return cached;

        const existing = await tx
            .select({ id: artistsTable.id })
            .from(artistsTable)
            .where(eq(artistsTable.name, name))
            .limit(1);

        if (existing.length > 0) {
            this.cache.artists.set(name, existing[0].id);
            return existing[0].id;
        }

        const newArtist: NewArtist = {
            name,
            sortName,
        };

        const inserted = await tx
            .insert(artistsTable)
            .values(newArtist)
            .onConflictDoUpdate({
                target: artistsTable.name,
                set: { name },
            })
            .returning({ id: artistsTable.id });

        const id = inserted[0].id;
        this.cache.artists.set(name, id);
        return id;
    }

    private async getOrCreateAlbumArtist(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        name: string,
    ): Promise<number> {
        const cached = this.cache.albumArtists.get(name);
        if (cached !== undefined) return cached;

        const existing = await tx
            .select({ id: albumArtistsTable.id })
            .from(albumArtistsTable)
            .where(eq(albumArtistsTable.name, name))
            .limit(1);

        if (existing.length > 0) {
            this.cache.albumArtists.set(name, existing[0].id);
            return existing[0].id;
        }

        const newAlbumArtist: NewAlbumArtist = { name };
        const inserted = await tx
            .insert(albumArtistsTable)
            .values(newAlbumArtist)
            .onConflictDoUpdate({
                target: albumArtistsTable.name,
                set: { name },
            })
            .returning({ id: albumArtistsTable.id });

        const id = inserted[0].id;
        this.cache.albumArtists.set(name, id);
        return id;
    }

    private async getOrCreateAlbum(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        title: string,
        albumArtistId: number,
        totalTracks: number | undefined,
        releaseDate: string | undefined,
    ): Promise<number> {
        const key = `${albumArtistId}|${title}`;
        const cached = this.cache.albums.get(key);
        if (cached !== undefined) return cached;

        const existing = await tx
            .select({ id: albumsTable.id })
            .from(albumsTable)
            .where(
                sql`${albumsTable.title} = ${title} AND ${albumsTable.albumArtistId} = ${albumArtistId}`,
            )
            .limit(1);

        if (existing.length > 0) {
            this.cache.albums.set(key, existing[0].id);
            return existing[0].id;
        }

        const newAlbum: NewAlbum = {
            title,
            albumArtistId,
            totalTracks,
            releaseDate,
        };

        const inserted = await tx
            .insert(albumsTable)
            .values(newAlbum)
            .onConflictDoUpdate({
                target: [albumsTable.title, albumsTable.albumArtistId],
                set: { title },
            })
            .returning({ id: albumsTable.id });

        const id = inserted[0].id;
        this.cache.albums.set(key, id);
        return id;
    }

    private async getOrCreateDisc(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        albumId: number,
        discNumber: number,
        discSubtitle: string | undefined,
    ): Promise<number> {
        const key = `${albumId}|${discNumber}`;
        const cached = this.cache.discs.get(key);
        if (cached !== undefined) return cached;

        const existing = await tx
            .select({ id: discsTable.id })
            .from(discsTable)
            .where(
                sql`${discsTable.albumId} = ${albumId} AND ${discsTable.discNumber} = ${discNumber}`,
            )
            .limit(1);

        if (existing.length > 0) {
            this.cache.discs.set(key, existing[0].id);
            return existing[0].id;
        }

        const newDisc: NewDisc = {
            albumId,
            discNumber,
            discSubtitle,
        };

        const inserted = await tx
            .insert(discsTable)
            .values(newDisc)
            .onConflictDoUpdate({
                target: [discsTable.albumId, discsTable.discNumber],
                set: { discNumber },
            })
            .returning({ id: discsTable.id });

        const id = inserted[0].id;
        this.cache.discs.set(key, id);
        return id;
    }

    private async saveTrack(
        sourceId: number,
        file: string,
        metadata: IAudioMetadata,
        mtime: number,
    ): Promise<void> {
        const common = metadata.common;
        const format = metadata.format;

        try {
            await db.transaction(async (tx) => {
                const artistName = common.artist || "unknown";
                const artistId = await this.getOrCreateArtist(
                    tx,
                    artistName,
                    common.artistsort,
                );

                const albumArtistName =
                    common.albumartist || artistName || "unknown";
                const albumArtistId = await this.getOrCreateAlbumArtist(
                    tx,
                    albumArtistName,
                );

                const albumTitle = common.album || "unknown";
                const albumId = await this.getOrCreateAlbum(
                    tx,
                    albumTitle,
                    albumArtistId,
                    common.track.of ?? undefined,
                    common.date ||
                        (common.year ? String(common.year) : undefined),
                );

                const discNumber = common.disk.no || 1;
                const discSubtitle = Array.isArray(common.discsubtitle)
                    ? common.discsubtitle[0]
                    : common.discsubtitle;

                const discId = await this.getOrCreateDisc(
                    tx,
                    albumId,
                    discNumber,
                    discSubtitle,
                );

                const title = common.title || file;
                const trackNumber = common.track.no;
                const duration = format.duration
                    ? Math.round(format.duration)
                    : undefined;

                const newTrack: NewTrack = {
                    sourceId,
                    albumId,
                    artistId,
                    discId,
                    title,
                    trackNumber,
                    duration,
                    relativePath: file,
                    fileFormat: format.container,
                    bitrate: format.bitrate,
                    sampleRate: format.sampleRate,
                    bitDepth: format.bitsPerSample,
                    modifiedAt: mtime,
                };

                await tx
                    .insert(tracksTable)
                    .values(newTrack)
                    .onConflictDoUpdate({
                        target: [
                            tracksTable.sourceId,
                            tracksTable.relativePath,
                        ],
                        set: newTrack,
                    });
            });
        } catch (err) {
            log(
                `transaction failed for ${file}: ${getErrorMessage(err)}`,
                "MediaImporter",
                "error",
            );
            throw err;
        }
    }

    async removeFile(sourceId: number, file: string): Promise<void> {
        try {
            await db.transaction(async (tx) => {
                await tx
                    .delete(tracksTable)
                    .where(
                        sql`${tracksTable.sourceId} = ${sourceId} AND ${tracksTable.relativePath} = ${file}`,
                    );
            });

            await new Promise((resolve) => setImmediate(resolve));
        } catch (err) {
            log(
                `failed to remove ${file}: ${getErrorMessage(err)}`,
                "MediaImporter",
                "error",
            );
            throw err;
        }
    }
}

export const importer = new MediaImporter();
