import type { Result } from "@shared/types/result";

import fs from "node:fs/promises";
import path from "node:path";

import { error, ok } from "@shared/types/result";
import { getErrorMessage } from "@shared/utils/logger";

export async function validatePath(
    sourcePath: string,
): Promise<Result<string, "invalid_path" | "not_found">> {
    if (!sourcePath.trim() || !path.isAbsolute(sourcePath))
        return error("A valid directory path is required", "invalid_path");

    const resolvedPath = path.resolve(sourcePath);

    try {
        const stats = await fs.stat(resolvedPath);
        if (!stats.isDirectory())
            return error(
                "The provided path does not belong to a directory",
                "invalid_path",
            );

        return ok(resolvedPath);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === "ENOENT")
            return error("The provided directory does not exist", "not_found");
        return error(getErrorMessage(err));
    }
}
