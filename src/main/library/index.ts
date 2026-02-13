import type {
    AddSourceResult,
    GetSourcesResult,
    RemoveSourceResult,
} from "@shared/types/library";

import path from "node:path";

import { db } from "@main/database";
import { sourcesTable } from "@main/database/schema";
import { validatePath } from "@main/utils/path";
import { error, ok } from "@shared/types/result";
import { eq } from "drizzle-orm";

class LibraryManager {
    async getSources(): Promise<GetSourcesResult> {
        try {
            const sources = await db.select().from(sourcesTable);
            return ok(sources);
        } catch {
            return error(
                "unknown",
                "An unknown error occurred while fetching media sources",
            );
        }
    }

    async addSource(
        sourcePath: string,
        name?: string,
    ): Promise<AddSourceResult> {
        try {
            // trim whitespace and strip surrounding quotes from user input
            sourcePath = sourcePath.trim().replace(/^["']|["']$/g, "");

            const validationResult = await validatePath(sourcePath);
            if (!validationResult.success) {
                const errorCode =
                    validationResult.error === "unknown"
                        ? "unknown"
                        : "invalid_source";
                return error(errorCode, validationResult.message);
            }

            const normalizedPath = validationResult.data;
            const displayName =
                name || path.basename(normalizedPath).trim() || normalizedPath;

            const result = await db
                .insert(sourcesTable)
                .values({ displayName, path: normalizedPath })
                .onConflictDoNothing()
                .returning();

            if (result.length === 0) {
                return error(
                    "duplicate_source",
                    "This media source has already been added to your library",
                );
            }

            return ok({
                source: result[0],
            });
        } catch {
            return error(
                "unknown",
                "An unknown error occurred while adding the source",
            );
        }
    }

    async removeSource(sourcePath: string): Promise<RemoveSourceResult> {
        try {
            const result = await db
                .delete(sourcesTable)
                .where(eq(sourcesTable.path, sourcePath));

            if (result.rowsAffected === 0) {
                return error(
                    "not_found",
                    `Media source ${sourcePath} not found`,
                );
            }

            return ok(true);
        } catch {
            return error(
                "unknown",
                "An unknown error occurred while removing the source",
            );
        }
    }
}

export const library = new LibraryManager();
