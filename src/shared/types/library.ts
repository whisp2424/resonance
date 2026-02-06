import type { Result } from "@shared/types/result";

export interface LibraryMediaSource {
    id: number;
    backend: string;
    uri: string;
    displayName: string;
}

export type AddSourceResult = Result<
    { source: LibraryMediaSource },
    "duplicate" | "invalid" | "unknown"
>;

export type RemoveSourceResult = Result<void, "not_found" | "io_error">;

export type GetSourcesResult = Result<LibraryMediaSource[], "io_error">;
