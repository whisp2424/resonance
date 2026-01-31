import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { app } from "electron";

const DB_FILENAME = "database.db";
const DB_PATH = is.dev
    ? join(process.cwd(), DB_FILENAME)
    : join(app.getPath("userData"), DB_FILENAME);

export const client = createClient({ url: `file:${DB_PATH}` });
client.execute("PRAGMA journal_mode = WAL");
client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle({ client: client });

export async function runMigrations(): Promise<void> {
    const migrationsFolder = is.dev
        ? join(process.cwd(), "drizzle")
        : join(process.resourcesPath, "drizzle");

    await migrate(db, { migrationsFolder });
}
