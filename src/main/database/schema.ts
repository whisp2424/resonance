import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";

export const sourcesTable = sqliteTable(
    "media_sources",
    {
        id: int().primaryKey({ autoIncrement: true }),
        type: text().notNull(),
        uri: text().notNull(),
        displayName: text().notNull(),
    },
    (table) => [unique().on(table.type, table.uri)],
);

export type MediaSource = typeof sourcesTable.$inferSelect;
export type NewMediaSource = typeof sourcesTable.$inferInsert;
