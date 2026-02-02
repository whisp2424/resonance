import path from "node:path";

/**
 * Normalizes a file system path by:
 * - Resolving relative paths to absolute paths
 * - Removing redundant separators
 * - Resolving . and .. segments
 * - Standardizing path separators for the platform
 *
 * @param uri The path to normalize
 * @returns The normalized absolute path
 */
export function normalizeFilePath(uri: string): string {
    const trimmedUri = uri.trim().replace(/^["']|["']$/g, "");
    const absolutePath = path.resolve(trimmedUri);
    return path.normalize(absolutePath);
}
