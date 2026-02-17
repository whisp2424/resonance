import type { Stats } from "node:fs";
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
import { fileTypeFromFile } from "file-type";
import { parseFile } from "music-metadata";
import pc from "picocolors";

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

    private async validateFile(absolutePath: string): Promise<Stats> {
        const stats = await stat(absolutePath);
        if (!stats.isFile()) throw new Error("Not a regular file");
        if (stats.size === 0) throw new Error("File is empty");
        if (stats.size < 128) throw new Error("File too small to be parsed");

        const fileType = await fileTypeFromFile(absolutePath);

        if (!fileType || !fileType.mime.startsWith("audio/"))
            throw new Error("Invalid or unsupported audio file type");

        return stats;
    }

    async importFile(
        sourceId: number,
        sourcePath: string,
        file: string,
    ): Promise<boolean> {
        const absolutePath = join(sourcePath, file);
        try {
            await this.validateFile(absolutePath);
        } catch (err) {
            log(getErrorMessage(err), "MediaImporter", "error");
            log(
                pc.dim(`invalid file: ${absolutePath}`),
                "MediaImporter",
                "warning",
            );
            return false;
        }

        try {
            const [metadata, stats] = await Promise.all([
                parseFile(absolutePath, { duration: true }),
                stat(absolutePath),
            ]);

            const mtime = Math.floor(stats.mtimeMs);
            this.saveTrack(sourceId, file, metadata, mtime);
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

    private getOrCreateArtist(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        name: string,
        sortName: string | undefined,
    ): number {
        const cached = this.cache.artists.get(name);
        if (cached !== undefined) return cached;

        const existing = tx
            .select({ id: artistsTable.id })
            .from(artistsTable)
            .where(eq(artistsTable.name, name))
            .limit(1)
            .all();

        if (existing.length > 0) {
            this.cache.artists.set(name, existing[0].id);
            return existing[0].id;
        }

        const newArtist: NewArtist = {
            name,
            sortName,
        };

        const inserted = tx
            .insert(artistsTable)
            .values(newArtist)
            .onConflictDoUpdate({
                target: artistsTable.name,
                set: { name },
            })
            .returning({ id: artistsTable.id })
            .all();

        const id = inserted[0].id;
        this.cache.artists.set(name, id);
        return id;
    }

    private getOrCreateAlbumArtist(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        name: string,
    ): number {
        const cached = this.cache.albumArtists.get(name);
        if (cached !== undefined) return cached;

        const existing = tx
            .select({ id: albumArtistsTable.id })
            .from(albumArtistsTable)
            .where(eq(albumArtistsTable.name, name))
            .limit(1)
            .all();

        if (existing.length > 0) {
            this.cache.albumArtists.set(name, existing[0].id);
            return existing[0].id;
        }

        const newAlbumArtist: NewAlbumArtist = { name };
        const inserted = tx
            .insert(albumArtistsTable)
            .values(newAlbumArtist)
            .onConflictDoUpdate({
                target: albumArtistsTable.name,
                set: { name },
            })
            .returning({ id: albumArtistsTable.id })
            .all();

        const id = inserted[0].id;
        this.cache.albumArtists.set(name, id);
        return id;
    }

    private getOrCreateAlbum(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        title: string,
        albumArtistId: number,
        totalTracks: number | undefined,
        releaseDate: string | undefined,
    ): number {
        const key = `${albumArtistId}|${title}`;
        const cached = this.cache.albums.get(key);
        if (cached !== undefined) return cached;

        const existing = tx
            .select({ id: albumsTable.id })
            .from(albumsTable)
            .where(
                sql`${albumsTable.title} = ${title} AND ${albumsTable.albumArtistId} = ${albumArtistId}`,
            )
            .limit(1)
            .all();

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

        const inserted = tx
            .insert(albumsTable)
            .values(newAlbum)
            .onConflictDoUpdate({
                target: [albumsTable.title, albumsTable.albumArtistId],
                set: { title },
            })
            .returning({ id: albumsTable.id })
            .all();

        const id = inserted[0].id;
        this.cache.albums.set(key, id);
        return id;
    }

    private getOrCreateDisc(
        tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
        albumId: number,
        discNumber: number,
        discSubtitle: string | undefined,
    ): number {
        const key = `${albumId}|${discNumber}`;
        const cached = this.cache.discs.get(key);
        if (cached !== undefined) return cached;

        const existing = tx
            .select({ id: discsTable.id })
            .from(discsTable)
            .where(
                sql`${discsTable.albumId} = ${albumId} AND ${discsTable.discNumber} = ${discNumber}`,
            )
            .limit(1)
            .all();

        if (existing.length > 0) {
            this.cache.discs.set(key, existing[0].id);
            return existing[0].id;
        }

        const newDisc: NewDisc = {
            albumId,
            discNumber,
            discSubtitle,
        };

        const inserted = tx
            .insert(discsTable)
            .values(newDisc)
            .onConflictDoUpdate({
                target: [discsTable.albumId, discsTable.discNumber],
                set: { discNumber },
            })
            .returning({ id: discsTable.id })
            .all();

        const id = inserted[0].id;
        this.cache.discs.set(key, id);
        return id;
    }

    private saveTrack(
        sourceId: number,
        file: string,
        metadata: IAudioMetadata,
        mtime: number,
    ): void {
        const common = metadata.common;
        const format = metadata.format;

        try {
            db.transaction((tx) => {
                const artistName = common.artist || "unknown";
                const artistId = this.getOrCreateArtist(
                    tx,
                    artistName,
                    common.artistsort,
                );

                const albumArtistName =
                    common.albumartist || artistName || "unknown";
                const albumArtistId = this.getOrCreateAlbumArtist(
                    tx,
                    albumArtistName,
                );

                const albumTitle = common.album || "unknown";
                const albumId = this.getOrCreateAlbum(
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

                const discId = this.getOrCreateDisc(
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

                tx.insert(tracksTable)
                    .values(newTrack)
                    .onConflictDoUpdate({
                        target: [
                            tracksTable.sourceId,
                            tracksTable.relativePath,
                        ],
                        set: newTrack,
                    })
                    .run();
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

    removeFile(sourceId: number, file: string): void {
        try {
            db.transaction((tx) => {
                tx.delete(tracksTable)
                    .where(
                        sql`${tracksTable.sourceId} = ${sourceId} AND ${tracksTable.relativePath} = ${file}`,
                    )
                    .run();
            });
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
