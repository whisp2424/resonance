import path from "node:path";

export function normalizeFilePath(uri: string): string {
    const trimmedUri = uri.trim().replace(/^["']|["']$/g, "");
    const absolutePath = path.resolve(trimmedUri);
    return path.normalize(absolutePath);
}
