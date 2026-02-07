import type { MediaBackend } from "@shared/constants/mediaBackends";
import type {
    AddSourceResult,
    GetSourcesResult,
    RemoveSourceResult,
} from "@shared/types/library";

import { db } from "@main/database";
import { sourcesTable } from "@main/database/schema";
import { LocalMediaBackend } from "@main/library/backends/local";
import { MediaBackendRegistry } from "@main/library/mediaBackendRegistry";
import { error, ok } from "@shared/types/result";
import { and, eq } from "drizzle-orm";

class LibraryManager {
    private backendRegistry = new MediaBackendRegistry();

    constructor() {
        this.backendRegistry.register(LocalMediaBackend);
    }

    /**
     * Returns all registered media sources.
     *
     * If a backend is provided, results will be filtered by that backend.
     */
    async getSources(backend?: MediaBackend): Promise<GetSourcesResult> {
        try {
            const query = db.select().from(sourcesTable).$dynamic();
            if (backend) query.where(eq(sourcesTable.backend, backend));
            const sources = await query;
            return ok(
                sources.map((source) => ({
                    ...source,
                    backend: source.backend as MediaBackend,
                })),
            );
        } catch {
            return error("io_error", "Failed to retrieve media sources");
        }
    }

    /**
     * Validates and adds a new media source.
     *
     * If a duplicate source with the same URI and backend exists, it will
     * return an error.
     */
    async addSource(
        uri: string,
        backend: MediaBackend,
        name?: string,
    ): Promise<AddSourceResult> {
        const backendInstance = this.backendRegistry.get(backend);

        if (!backendInstance) {
            return error(
                "unknown",
                `Media backend "${backend}" does not exist or implementation is missing`,
            );
        }

        // trim whitespace and strip surrounding quotes from user input
        uri = uri.trim().replace(/^["']|["']$/g, "");

        const validationResult = await backendInstance.validateUri(uri);
        if (!validationResult.valid)
            return error("invalid", validationResult.error);

        const normalizedUri = validationResult.uri;
        const displayName = name || backendInstance.parseName(normalizedUri);

        const result = await db
            .insert(sourcesTable)
            .values({ displayName, uri: normalizedUri, backend })
            .onConflictDoNothing()
            .returning();

        if (result.length === 0) {
            return error(
                "duplicate",
                "This media source has already been added to your library",
            );
        }

        return ok({
            source: {
                ...result[0],
                backend: result[0].backend as MediaBackend,
            },
        });
    }

    async removeSource(
        uri: string,
        backend: MediaBackend,
    ): Promise<RemoveSourceResult> {
        try {
            const result = await db
                .delete(sourcesTable)
                .where(
                    and(
                        eq(sourcesTable.uri, uri),
                        eq(sourcesTable.backend, backend),
                    ),
                );

            if (result.rowsAffected === 0) {
                return error(
                    "not_found",
                    `Media source ${uri} (${backend}) not found`,
                );
            }

            return ok(void 0);
        } catch {
            return error("io_error", "Failed to remove media source");
        }
    }
}

export const libraryManager = new LibraryManager();
