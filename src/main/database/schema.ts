import { index, int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const sourcesTable = sqliteTable(
    "media_sources",
    {
        id: int().primaryKey({ autoIncrement: true }),
        path: text().notNull(),
        displayName: text().notNull(),
    },
    (table) => [unique().on(table.path)],
);

export type MediaSource = typeof sourcesTable.$inferSelect;
export type NewMediaSource = typeof sourcesTable.$inferInsert;

export const artistsTable = sqliteTable("artists", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
    sortName: text(),
});

export type Artist = typeof artistsTable.$inferSelect;
export type NewArtist = typeof artistsTable.$inferInsert;

export const albumArtistsTable = sqliteTable("album_artists", {
    id: int().primaryKey({ autoIncrement: true }),
    name: text().notNull(),
});

export type AlbumArtist = typeof albumArtistsTable.$inferSelect;
export type NewAlbumArtist = typeof albumArtistsTable.$inferInsert;

export const albumsTable = sqliteTable("albums", {
    id: int().primaryKey({ autoIncrement: true }),
    albumArtistId: int()
        .notNull()
        .references(() => albumArtistsTable.id, { onDelete: "cascade" }),
    title: text().notNull(),
    releaseDate: text(),
    totalTracks: int(),
    totalLength: int(),
    artworkPath: text(),
});

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
        subtitle: text(),
    },
    (table) => [unique().on(table.albumId, table.discNumber)],
);

export type Disc = typeof discsTable.$inferSelect;
export type NewDisc = typeof discsTable.$inferInsert;

export const tracksTable = sqliteTable(
    "tracks",
    {
        id: int().primaryKey({ autoIncrement: true }),
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
        title: text().notNull(),
        trackNumber: int(),
        duration: int(),
        relativePath: text().notNull(),
        fileFormat: text(),
        bitrate: int(),
        sampleRate: int(),
        modifiedAt: int(),
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
