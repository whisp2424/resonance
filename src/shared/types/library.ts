import type { MediaSource } from "@shared/database/schema";
import type { Result } from "@shared/types/result";

export type AddSourceResult = Result<
    { source: MediaSource },
    "duplicate_source" | "invalid_source"
>;

export type RemoveSourceResult = Result<true, "not_found">;

export type GetSourcesResult = Result<MediaSource[]>;

export interface ScanSourceSuccess {
    success: true;
    errors: string[];
}

export type ScanSourceResult = Result<ScanSourceSuccess, "invalid_source">;
