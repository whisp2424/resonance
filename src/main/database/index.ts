import { join } from "node:path";

import { is } from "@electron-toolkit/utils";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { app } from "electron";

const DB_FILENAME = "database.db";
const DB_PATH = is.dev
    ? `../../../${DB_FILENAME}`
    : join(app.getPath("userData"), DB_FILENAME);

const client = createClient({ url: `file:${DB_PATH}` });
client.execute("PRAGMA journal_mode = WAL");
client.execute("PRAGMA foreign_keys = ON");

export const db = drizzle({ client: client });
