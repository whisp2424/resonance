import type { SourceType } from "@shared/constants/sources";
import type { LibraryMediaSource } from "@shared/types/library";

import { db } from "@main/database";
import { sourcesTable } from "@main/database/schema";
import { MediaBackendRegistry } from "@main/library/mediaSourceRegistry";
import { LocalMediaBackend } from "@main/library/sources/local";
import { log } from "@shared/utils/logger";
import { and, eq } from "drizzle-orm";

class LibraryManager {
    private backendRegistry = new MediaBackendRegistry();

    constructor() {
        this.backendRegistry.register(LocalMediaBackend);
    }

    async getSources(type?: SourceType): Promise<LibraryMediaSource[]> {
        const query = db.select().from(sourcesTable).$dynamic();
        if (type) query.where(eq(sourcesTable.type, type));

        const sources = await query;

        if (sources.length === 0)
            log("no media sources found in the database!", "library");

        return sources;
    }

    async addSource(
        uri: string,
        type: SourceType,
        name?: string,
    ): Promise<LibraryMediaSource | undefined> {
        const backend = this.backendRegistry.get(type);

        if (!backend) {
            throw new Error(
                `Media source does not exist or implementation is missing: ${type}`,
            );
        }

        const displayName = name || backend.parseName(uri);

        const result = await db
            .insert(sourcesTable)
            .values({ displayName, uri, type })
            .onConflictDoNothing()
            .returning();

        if (result.length === 0)
            log(
                `media source ${uri} (${type}) already exists`,
                "library",
                "warning",
            );

        return result[0];
    }

    async removeSource(uri: string, type: SourceType = "local") {
        const result = await db
            .delete(sourcesTable)
            .where(and(eq(sourcesTable.uri, uri), eq(sourcesTable.type, type)));

        if (result.rowsAffected === 0) {
            log(
                `tried to delete media source ${uri} (${type}), but it doesn't exist!`,
                "library",
                "warning",
            );
        }
    }
}

export const libraryManager = new LibraryManager();
