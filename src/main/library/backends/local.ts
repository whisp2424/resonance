import fs from "node:fs/promises";
import path from "node:path";

import { MediaBackend } from "@main/library/types/mediaBackend";
import { getErrorMessage } from "@shared/utils/logger";

export class LocalMediaBackend extends MediaBackend {
    readonly BACKEND_NAME = "local";

    parseName(uri: string): string {
        return path.basename(uri).trim() || uri;
    }

    async validateUri(
        uri: string,
    ): Promise<{ valid: true; uri: string } | { valid: false; error: string }> {
        if (!uri.trim() || !path.isAbsolute(uri))
            return {
                valid: false,
                error: "A valid directory path is required",
            };

        const resolvedPath = path.resolve(uri);

        try {
            const stats = await fs.stat(resolvedPath);
            if (!stats.isDirectory())
                return {
                    valid: false,
                    error: "The provided path does not belong to a directory",
                };

            return {
                valid: true,
                uri: resolvedPath,
            };
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                return {
                    valid: false,
                    error: "The provided directory does not exist",
                };
            }

            return {
                valid: false,
                error: getErrorMessage(err),
            };
        }
    }
}
