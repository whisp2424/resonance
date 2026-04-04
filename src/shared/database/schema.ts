import { index, int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const sourcesTable = sqliteTable(
    "media_sources",
    {
        id: int().primaryKey({ autoIncrement: true }),
        path: text().notNull(),
        displayName: text().notNull(),
        fileCount: int().notNull().default(0),
        lastUpdated: int().notNull(),
    },
    (table) => [unique().on(table.path)],
);

export type MediaSource = typeof sourcesTable.$inferSelect;
export type NewMediaSource = typeof sourcesTable.$inferInsert;

export const artistsTable = sqliteTable(
    "artists",
    {
        id: int().primaryKey({ autoIncrement: true }),
        name: text().notNull(),
        sortName: text(),
        musicbrainzArtistId: text(),
    },
    (table) => [unique().on(table.name)],
);

export type Artist = typeof artistsTable.$inferSelect;
export type NewArtist = typeof artistsTable.$inferInsert;

export const albumArtistsTable = sqliteTable(
    "album_artists",
    {
        id: int().primaryKey({ autoIncrement: true }),
        name: text().notNull(),
        sortName: text(),
        musicbrainzArtistId: text(),
    },
    (table) => [unique().on(table.name)],
);

export type AlbumArtist = typeof albumArtistsTable.$inferSelect;
export type NewAlbumArtist = typeof albumArtistsTable.$inferInsert;

export const albumsTable = sqliteTable(
    "albums",
    {
        id: int().primaryKey({ autoIncrement: true }),
        albumArtistId: int()
            .notNull()
            .references(() => albumArtistsTable.id, { onDelete: "cascade" }),

        // metadata
        title: text().notNull(),
        sortTitle: text(),
        releaseDate: text(),
        originalDate: text(),
        releaseStatus: text(),
        releaseType: text(),
        label: text(),

        // identifiers
        musicbrainzAlbumId: text(),
        musicbrainzReleaseGroupId: text(),

        // properties
        totalTracks: int(),
        totalLength: int(),
        artworkPath: text(),
    },
    (table) => [unique().on(table.title, table.albumArtistId)],
);

export type Album = typeof albumsTable.$inferSelect;
export type NewAlbum = typeof albumsTable.$inferInsert;

export const discsTable = sqliteTable(
    "discs",
    {
        id: int().primaryKey({ autoIncrement: true }),
        albumId: int()
            .notNull()
            .references(() => albumsTable.id, { onDelete: "cascade" }),

        discNumber: int().notNull(),
        discSubtitle: text(),
    },
    (table) => [unique().on(table.albumId, table.discNumber)],
);

export type Disc = typeof discsTable.$inferSelect;
export type NewDisc = typeof discsTable.$inferInsert;

export const tracksTable = sqliteTable(
    "tracks",
    {
        id: int().primaryKey({ autoIncrement: true }),

        // relationships
        sourceId: int()
            .notNull()
            .references(() => sourcesTable.id, { onDelete: "cascade" }),
        albumId: int().references(() => albumsTable.id, {
            onDelete: "cascade",
        }),
        discId: int().references(() => discsTable.id, { onDelete: "cascade" }),
        artistId: int()
            .notNull()
            .references(() => artistsTable.id, { onDelete: "cascade" }),

        // basic track info
        relativePath: text().notNull(),
        title: text().notNull(),
        sortTitle: text(),
        trackNumber: int(),
        modifiedAt: int(),

        // audio properties
        container: text().notNull(),
        codec: text().notNull(),
        channels: int(),
        durationMs: int().notNull(),
        samples: int(),
        lossless: int({ mode: "boolean" }),
        bitrateKbps: int(),
        sampleRateHz: int(),
        bitDepth: int(),
        bpm: int(),
        key: text(),

        // replaygain
        replayGainTrackGain: int(),
        replayGainTrackPeak: int(),
        replayGainAlbumGain: int(),
        replayGainAlbumPeak: int(),

        // identifiers
        isrc: text(),
        acoustidId: text(),
        musicbrainzRecordingId: text(),
        musicbrainzTrackId: text(),

        // track stats
        playCount: int().notNull().default(0),
    },
    (table) => [
        unique().on(table.sourceId, table.relativePath),
        index("idx_tracks_source").on(table.sourceId),
        index("idx_tracks_album").on(table.albumId),
        index("idx_tracks_disc").on(table.discId),
        index("idx_tracks_artist").on(table.artistId),
        index("idx_tracks_album_order").on(
            table.albumId,
            table.discId,
            table.trackNumber,
        ),
    ],
);

export type Track = typeof tracksTable.$inferSelect;
export type NewTrack = typeof tracksTable.$inferInsert;

export const genresTable = sqliteTable(
    "genres",
    {
        id: int().primaryKey({ autoIncrement: true }),
        name: text().notNull(),
    },
    (table) => [unique().on(table.name)],
);

export type Genre = typeof genresTable.$inferSelect;
export type NewGenre = typeof genresTable.$inferInsert;

export const trackGenresTable = sqliteTable(
    "track_genres",
    {
        trackId: int()
            .notNull()
            .references(() => tracksTable.id, { onDelete: "cascade" }),
        genreId: int()
            .notNull()
            .references(() => genresTable.id, { onDelete: "cascade" }),
    },
    (table) => [
        unique().on(table.trackId, table.genreId),
        index("idx_track_genres_track").on(table.trackId),
        index("idx_track_genres_genre").on(table.genreId),
    ],
);

export type TrackGenre = typeof trackGenresTable.$inferSelect;
export type NewTrackGenre = typeof trackGenresTable.$inferInsert;
