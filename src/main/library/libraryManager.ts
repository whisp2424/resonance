import type { MediaBackend } from "@shared/constants/mediaBackends";
import type {
    AddSourceResult,
    LibraryMediaSource,
} from "@shared/types/library";

import { db } from "@main/database";
import { sourcesTable } from "@main/database/schema";
import { LocalMediaBackend } from "@main/library/backends/local";
import { MediaBackendRegistry } from "@main/library/mediaBackendRegistry";
import { log } from "@shared/utils/logger";
import { and, eq } from "drizzle-orm";

class LibraryManager {
    private backendRegistry = new MediaBackendRegistry();

    constructor() {
        this.backendRegistry.register(LocalMediaBackend);
    }

    async getSources(backend?: MediaBackend): Promise<LibraryMediaSource[]> {
        const query = db.select().from(sourcesTable).$dynamic();
        if (backend) query.where(eq(sourcesTable.backend, backend));

        const sources = await query;
        return sources;
    }

    async addSource(
        uri: string,
        backend: MediaBackend,
        name?: string,
    ): Promise<AddSourceResult> {
        const backendInstance = this.backendRegistry.get(backend);

        if (!backendInstance) {
            log(
                `Media backend "${backend}" does not exist or implementation is missing`,
                "library",
                "error",
            );
            return {
                success: false,
                error: "unknown",
                message: `Media backend "${backend}" does not exist or implementation is missing`,
            };
        }

        uri = uri.trim().replace(/^["']|["']$/g, "");

        const validationResult = await backendInstance.validateUri(uri);
        if (!validationResult.valid) {
            return {
                success: false,
                error: "invalid",
                message: validationResult.error,
            };
        }

        const normalizedUri = validationResult.normalizedUri;
        const displayName = name || backendInstance.parseName(normalizedUri);
        const result = await db
            .insert(sourcesTable)
            .values({ displayName, uri: normalizedUri, backend })
            .onConflictDoNothing()
            .returning();

        if (result.length === 0) {
            return {
                success: false,
                error: "duplicate",
                message:
                    "This media source has already been added to your library",
            };
        }

        return { success: true, source: result[0] };
    }

    async removeSource(uri: string, backend: MediaBackend = "local") {
        const result = await db
            .delete(sourcesTable)
            .where(
                and(
                    eq(sourcesTable.uri, uri),
                    eq(sourcesTable.backend, backend),
                ),
            );

        if (result.rowsAffected === 0) {
            log(
                `tried to delete media source ${uri} (${backend}), but it doesn't exist!`,
                "library",
                "warning",
            );
        }
    }
}

export const libraryManager = new LibraryManager();
