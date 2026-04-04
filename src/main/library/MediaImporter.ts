// TODO: album cover artwork parsing

import type { Stats } from "node:fs";
import type {
    NewAlbum,
    NewAlbumArtist,
    NewArtist,
    NewDisc,
    NewGenre,
    NewTrack,
    NewTrackGenre,
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
    genresTable,
    trackGenresTable,
    tracksTable,
} from "@shared/database/schema";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";
import { eq, sql } from "drizzle-orm";
import { fileTypeFromFile } from "file-type";
import { parseFile } from "music-metadata";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface ParsedTrack {
    file: string;
    metadata: IAudioMetadata;
    mtime: number;
}

export type ParseResult = Result<ParsedTrack, "invalid_file" | "parse_failed">;

export class MediaImporter {
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
        musicbrainzArtistId: string | undefined,
    ): Result<number> {
        try {
            const existing = tx
                .select({ id: artistsTable.id })
                .from(artistsTable)
                .where(eq(artistsTable.name, name))
                .limit(1)
                .all();

            if (existing.length > 0) return ok(existing[0].id);

            const newArtist: NewArtist = {
                name,
                sortName,
                musicbrainzArtistId,
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

            return ok(inserted[0].id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    private getOrCreateAlbumArtist(
        tx: Transaction,
        name: string,
        sortName: string | undefined,
        musicbrainzArtistId: string | undefined,
    ): Result<number> {
        try {
            const existing = tx
                .select({ id: albumArtistsTable.id })
                .from(albumArtistsTable)
                .where(eq(albumArtistsTable.name, name))
                .limit(1)
                .all();

            if (existing.length > 0) return ok(existing[0].id);

            const newAlbumArtist: NewAlbumArtist = {
                name,
                sortName,
                musicbrainzArtistId,
            };

            const inserted = tx
                .insert(albumArtistsTable)
                .values(newAlbumArtist)
                .onConflictDoUpdate({
                    target: albumArtistsTable.name,
                    set: { name },
                })
                .returning({ id: albumArtistsTable.id })
                .all();

            return ok(inserted[0].id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    private getOrCreateAlbum(
        tx: Transaction,
        albumArtistId: number,
        title: string,
        sortTitle: string | undefined,
        totalTracks: number | undefined,
        releaseDate: string | undefined,
        originalDate: string | undefined,
        releaseStatus: string | undefined,
        releaseType: string | undefined,
        label: string | undefined,
        musicbrainzAlbumId: string | undefined,
        musicbrainzReleaseGroupId: string | undefined,
    ): Result<number> {
        try {
            const existing = tx
                .select({ id: albumsTable.id })
                .from(albumsTable)
                .where(
                    sql`${albumsTable.title} = ${title} AND ${albumsTable.albumArtistId} = ${albumArtistId}`,
                )
                .limit(1)
                .all();

            if (existing.length > 0) return ok(existing[0].id);

            const newAlbum: NewAlbum = {
                albumArtistId,
                title,
                sortTitle,
                totalTracks,
                releaseDate,
                originalDate,
                releaseStatus,
                releaseType,
                label,
                musicbrainzAlbumId,
                musicbrainzReleaseGroupId,
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

            return ok(inserted[0].id);
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
        try {
            const existing = tx
                .select({ id: discsTable.id })
                .from(discsTable)
                .where(
                    sql`${discsTable.albumId} = ${albumId} AND ${discsTable.discNumber} = ${discNumber}`,
                )
                .limit(1)
                .all();

            if (existing.length > 0) return ok(existing[0].id);

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

            return ok(inserted[0].id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    private getOrCreateGenre(tx: Transaction, name: string): Result<number> {
        try {
            const existing = tx
                .select({ id: genresTable.id })
                .from(genresTable)
                .where(eq(genresTable.name, name))
                .limit(1)
                .all();

            if (existing.length > 0) return ok(existing[0].id);

            const newGenre: NewGenre = { name };

            const inserted = tx
                .insert(genresTable)
                .values(newGenre)
                .onConflictDoUpdate({
                    target: genresTable.name,
                    set: { name },
                })
                .returning({ id: genresTable.id })
                .all();

            return ok(inserted[0].id);
        } catch (err) {
            return error(getErrorMessage(err));
        }
    }

    // TODO: multiple artist parsing
    private saveTrack(
        tx: Transaction,
        sourceId: number,
        track: ParsedTrack,
    ): Result<
        void,
        "invalid_duration" | "invalid_container" | "invalid_sample_rate"
    > {
        const { file, metadata, mtime } = track;
        const common = metadata.common;
        const format = metadata.format;

        // simple parsing for now, we rely on the single artist string
        const artistName = common.artist || "unknown";
        const artistResult = this.getOrCreateArtist(
            tx,
            artistName,
            common.artistsort,
            common.musicbrainz_artistid?.[0],
        );

        if (!artistResult.success) return artistResult;

        // simple parsing for now, we rely on the single album artist string
        const albumArtistName = common.albumartist || artistName || "unknown";
        const albumArtistResult = this.getOrCreateAlbumArtist(
            tx,
            albumArtistName,
            common.albumartistsort,
            common.musicbrainz_albumartistid?.[0],
        );

        if (!albumArtistResult.success) return albumArtistResult;

        const albumTitle = common.album || "unknown";
        const albumResult = this.getOrCreateAlbum(
            tx,
            albumArtistResult.data,
            albumTitle,
            common.albumsort,
            common.track.of ?? undefined,
            common.date || (common.year ? String(common.year) : undefined),
            common.originaldate,
            common.releasestatus,
            common.releasetype?.[0],
            common.label?.[0],
            common.musicbrainz_albumid,
            common.musicbrainz_releasegroupid,
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

        if (!format.duration)
            return error(
                "Total duration couldn't be parsed for this track",
                "invalid_duration",
            );

        if (!format.container)
            return error(
                "Couldn't parse container format for this track",
                "invalid_container",
            );

        if (!format.sampleRate)
            return error(
                "Couldn't parse sample rate for this track",
                "invalid_sample_rate",
            );

        const newTrack: NewTrack = {
            // relationships
            sourceId,
            albumId: albumResult.data,
            discId: discResult.data,
            artistId: artistResult.data,

            // basic track info
            relativePath: file,
            title: common.title || file,
            sortTitle: common.titlesort,
            trackNumber: common.track.no ?? undefined,
            modifiedAt: mtime,

            // audio properties
            container: format.container,
            codec: format.codec ?? format.container,
            channels: format.numberOfChannels,
            durationMs: Math.round(format.duration * 1000),
            samples: format.numberOfSamples,
            lossless: format.lossless,
            bitrateKbps:
                format.bitrate != null
                    ? Math.round(format.bitrate / 1000)
                    : undefined,
            sampleRateHz: format.sampleRate,
            bitDepth: format.bitsPerSample,
            bpm: common.bpm != null ? Math.round(common.bpm) : undefined,
            key: common.key,

            // replaygain
            replayGainTrackGain:
                common.replaygain_track_gain?.dB != null
                    ? Math.round(common.replaygain_track_gain.dB * 100)
                    : undefined,
            replayGainTrackPeak:
                common.replaygain_track_peak?.ratio != null
                    ? Math.round(common.replaygain_track_peak.ratio * 1_000_000)
                    : undefined,
            replayGainAlbumGain:
                common.replaygain_album_gain?.dB != null
                    ? Math.round(common.replaygain_album_gain.dB * 100)
                    : undefined,
            replayGainAlbumPeak:
                common.replaygain_album_peak?.ratio != null
                    ? Math.round(common.replaygain_album_peak.ratio * 1_000_000)
                    : undefined,

            // identifiers
            isrc: common.isrc?.[0],
            acoustidId: common.acoustid_id,
            musicbrainzRecordingId: common.musicbrainz_recordingid,
            musicbrainzTrackId: common.musicbrainz_trackid,
        };

        try {
            const inserted = tx
                .insert(tracksTable)
                .values(newTrack)
                .onConflictDoUpdate({
                    target: [tracksTable.sourceId, tracksTable.relativePath],
                    set: newTrack,
                })
                .returning({ id: tracksTable.id })
                .all();

            const trackId = inserted[0].id;

            if (common.genre && common.genre.length > 0) {
                tx.delete(trackGenresTable)
                    .where(eq(trackGenresTable.trackId, trackId))
                    .run();

                for (const genreName of common.genre) {
                    const genreResult = this.getOrCreateGenre(tx, genreName);
                    if (!genreResult.success) continue;

                    const newTrackGenre: NewTrackGenre = {
                        trackId,
                        genreId: genreResult.data,
                    };

                    tx.insert(trackGenresTable)
                        .values(newTrackGenre)
                        .onConflictDoNothing()
                        .run();
                }
            }

            return ok(undefined);
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
