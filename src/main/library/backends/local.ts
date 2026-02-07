import fs from "node:fs/promises";
import path from "node:path";

import { MediaBackend } from "@main/library/types/mediaBackend";
import { normalizeFilePath } from "@main/utils/path";

export class LocalMediaBackend extends MediaBackend {
    readonly BACKEND_NAME = "local";

    parseName(uri: string): string {
        const normalizedPath = normalizeFilePath(uri);
        return path.basename(normalizedPath).trim() || normalizedPath;
    }

    async validateUri(
        uri: string,
    ): Promise<{ valid: true; uri: string } | { valid: false; error: string }> {
        const normalizedPath = normalizeFilePath(uri);

        try {
            const stats = await fs.stat(normalizedPath);
            if (!stats.isDirectory())
                return {
                    valid: false,
                    error: "The path you provided does not belong to a directory. Ensure the path is correct and try again.",
                };

            return {
                valid: true,
                uri: normalizedPath,
            };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === "ENOENT")
                return {
                    valid: false,
                    error: "The provided directory does not exist. Ensure the path is correct and try again.",
                };
            return {
                valid: false,
                error: `An error occurred while trying to access the given path: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }
}
