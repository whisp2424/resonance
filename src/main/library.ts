import type { MediaSource } from "@main/database/schema";

import { db } from "@main/database";
import { sourcesTable } from "@main/database/schema";
import { log } from "@shared/utils/logger";
import { and, eq } from "drizzle-orm";

// for now, we only care about implementing local playback, but the possibility
// to easily extend later on more sources exists.
export type SourceType = "local";

class LibraryManager {
    async getSources(type?: SourceType): Promise<MediaSource[]> {
        const query = db.select().from(sourcesTable).$dynamic();
        if (type) query.where(eq(sourcesTable.type, type));

        const sources = await query;

        if (sources.length === 0)
            log("no media sources found in the database!", "library");

        return sources;
    }

    async addSource(uri: string, type: SourceType) {
        const result = await db
            .insert(sourcesTable)
            .values({ uri, type })
            .onConflictDoNothing()
            .returning();

        if (result.length === 0)
            log(`source ${uri} (${type}) already exists`, "library", "warning");

        return result[0];
    }

    async removeSource(uri: string, type: SourceType = "local") {
        const result = await db
            .delete(sourcesTable)
            .where(and(eq(sourcesTable.uri, uri), eq(sourcesTable.type, type)));

        if (result.rowsAffected === 0) {
            log(
                `tried to delete source ${uri} (${type}), but it doesn't exist!`,
                "library",
                "warning",
            );
        }
    }
}

export const library = new LibraryManager();
