import type { Stats } from "node:fs";
import type {
    NewAlbum,
    NewAlbumArtist,
    NewArtist,
    NewDisc,
    NewTrack,
} from "@shared/database/schema";
import type { Result } from "@shared/types/result";
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
} from "@shared/database/schema";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";
import { eq, sql } from "drizzle-orm";
import { fileTypeFromFile } from "file-type";
import { parseFile } from "music-metadata";

interface ImportCache {
    artists: Map<string, number>;
    albumArtists: Map<string, number>;
    albums: Map<string, number>;
    discs: Map<string, number>;
}

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ParsedTrack {
    file: string;
    metadata: IAudioMetadata;
    mtime: number;
}

export type ParseResult = Result<ParsedTrack, "invalid_file" | "parse_failed">;

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

    async parseMetadata(
        sourcePath: string,
        file: string,
    ): Promise<ParseResult> {
        const absolutePath = join(sourcePath, file);

        try {
            await this.validateFile(absolutePath);
        } catch (err) {
            return error(getErrorMessage(err), "invalid_file");
        }

        try {
            const [metadata, stats] = await Promise.all([
                parseFile(absolutePath, { duration: true }),
                stat(absolutePath),
            ]);

            const mtime = Math.floor(stats.mtimeMs);
            return ok({ file, metadata, mtime });
        } catch (err) {
            return error(getErrorMessage(err), "parse_failed");
        }
    }

    async importFiles(
        sourceId: number,
        tracks: ParsedTrack[],
    ): Promise<Result<{ failed: string[] }>> {
        const failed: string[] = [];

        try {
            db.transaction((tx) => {
                for (const track of tracks) {
                    const result = this.saveTrack(tx, sourceId, track);
                    if (!result.success) {
                        failed.push(track.file);
                        log(result.message, "MediaImporter", "error");
                    }
                }
            });
        } catch (err) {
            log(getErrorMessage(err), "MediaImporter", "error");
            return error(getErrorMessage(err));
        }

        return ok({ failed });
    }

    private getOrCreateArtist(
        tx: Transaction,
        name: string,
        sortName: string | undefined,
    ): Result<number> {
        const cached = this.cache.artists.get(name);
        if (cached !== undefined) return ok(cached);

        try {
            const existing = tx
                .select({ id: artistsTable.id })
                .from(artistsTable)
                .where(eq(artistsTable.name, name))
                .limit(1)
                .all();

            if (existing.length > 0) {
                this.cache.artists.set(name, existing[0].id);
                return ok(existing[0].id);
            }

            const newArtist: NewArtist = { name, sortName };

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
            return ok(id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    private getOrCreateAlbumArtist(
        tx: Transaction,
        name: string,
    ): Result<number> {
        const cached = this.cache.albumArtists.get(name);
        if (cached !== undefined) return ok(cached);

        try {
            const existing = tx
                .select({ id: albumArtistsTable.id })
                .from(albumArtistsTable)
                .where(eq(albumArtistsTable.name, name))
                .limit(1)
                .all();

            if (existing.length > 0) {
                this.cache.albumArtists.set(name, existing[0].id);
                return ok(existing[0].id);
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
            return ok(id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    private getOrCreateAlbum(
        tx: Transaction,
        title: string,
        albumArtistId: number,
        totalTracks: number | undefined,
        releaseDate: string | undefined,
    ): Result<number> {
        const key = `${albumArtistId}|${title}`;
        const cached = this.cache.albums.get(key);
        if (cached !== undefined) return ok(cached);

        try {
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
                return ok(existing[0].id);
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
            return ok(id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    private getOrCreateDisc(
        tx: Transaction,
        albumId: number,
        discNumber: number,
        discSubtitle: string | undefined,
    ): Result<number> {
        const key = `${albumId}|${discNumber}`;
        const cached = this.cache.discs.get(key);
        if (cached !== undefined) return ok(cached);

        try {
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
                return ok(existing[0].id);
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
            return ok(id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    private saveTrack(
        tx: Transaction,
        sourceId: number,
        track: ParsedTrack,
    ): Result<boolean> {
        const { file, metadata, mtime } = track;
        const common = metadata.common;
        const format = metadata.format;

        const artistName = common.artist || "unknown";
        const artistResult = this.getOrCreateArtist(
            tx,
            artistName,
            common.artistsort,
        );
        if (!artistResult.success) return artistResult;

        const albumArtistName = common.albumartist || artistName || "unknown";
        const albumArtistResult = this.getOrCreateAlbumArtist(
            tx,
            albumArtistName,
        );
        if (!albumArtistResult.success) return albumArtistResult;

        const albumTitle = common.album || "unknown";
        const albumResult = this.getOrCreateAlbum(
            tx,
            albumTitle,
            albumArtistResult.data,
            common.track.of ?? undefined,
            common.date || (common.year ? String(common.year) : undefined),
        );
        if (!albumResult.success) return albumResult;

        const discNumber = common.disk.no || 1;
        const discSubtitle = Array.isArray(common.discsubtitle)
            ? common.discsubtitle[0]
            : common.discsubtitle;

        const discResult = this.getOrCreateDisc(
            tx,
            albumResult.data,
            discNumber,
            discSubtitle,
        );
        if (!discResult.success) return discResult;

        const title = common.title || file;
        const trackNumber = common.track.no;
        const duration = format.duration
            ? Math.round(format.duration)
            : undefined;

        const newTrack: NewTrack = {
            sourceId,
            albumId: albumResult.data,
            artistId: artistResult.data,
            discId: discResult.data,
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

        try {
            tx.insert(tracksTable)
                .values(newTrack)
                .onConflictDoUpdate({
                    target: [tracksTable.sourceId, tracksTable.relativePath],
                    set: newTrack,
                })
                .run();
            return ok(true);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    removeFiles(sourceId: number, files: string[]): Result<boolean> {
        if (files.length === 0) return ok(true);
        try {
            db.transaction((tx) => {
                for (const file of files) {
                    tx.delete(tracksTable)
                        .where(
                            sql`${tracksTable.sourceId} = ${sourceId} AND ${tracksTable.relativePath} = ${file}`,
                        )
                        .run();
                }
            });
            return ok(true);
        } catch (err) {
            log(getErrorMessage(err), "MediaImporter", "error");
            return error(getErrorMessage(err));
        }
    }
}

export const importer = new MediaImporter();
