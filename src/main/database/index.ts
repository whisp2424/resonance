import type Database from "better-sqlite3";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { app } from "electron";

import * as schema from "./schema";

const DB_FILENAME = "database.db";
const DB_PATH = is.dev
    ? join(process.cwd(), DB_FILENAME)
    : join(app.getPath("userData"), DB_FILENAME);

export const sqlite: Database.Database = new BetterSqlite3(DB_PATH);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db: BetterSQLite3Database<typeof schema> = drizzle({
    client: sqlite,
    schema,
});

export function runMigrations(): void {
    const migrationsFolder = is.dev
        ? join(process.cwd(), "drizzle")
        : join(process.resourcesPath, "drizzle");

    try {
        migrate(db, { migrationsFolder });
    } catch (err) {
        console.error("Migration failed:", err);
        if (!is.dev) throw err;
    }
}
