import type { Result } from "@shared/types/result";

export interface LibraryMediaSource {
    id: number;
    path: string;
    displayName: string;
}

export type AddSourceResult = Result<
    { source: LibraryMediaSource },
    "duplicate_source" | "invalid_source" | "unknown"
>;

export type RemoveSourceResult = Result<true, "not_found" | "unknown">;

export type GetSourcesResult = Result<LibraryMediaSource[], "unknown">;
