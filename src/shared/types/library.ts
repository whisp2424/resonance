import type { Result } from "@shared/types/result";

export interface LibraryMediaSource {
    id: number;
    path: string;
    displayName: string;
    fileCount: number;
    lastUpdated: number;
}

export type AddSourceResult = Result<
    { source: LibraryMediaSource },
    "duplicate_source" | "invalid_source"
>;

export type RemoveSourceResult = Result<true, "not_found">;

export type GetSourcesResult = Result<LibraryMediaSource[]>;

export interface ScanSourceSuccess {
    success: true;
    errors: string[];
}

export type ScanSourceResult = Result<ScanSourceSuccess, "invalid_source">;
