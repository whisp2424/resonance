import type {
    Album,
    AlbumArtist,
    Artist,
    Disc,
    Genre,
    MediaSource,
    Track,
} from "@shared/database/schema";
import type { Result } from "@shared/types/result";

export type AddSourceResult = Result<
    { source: MediaSource },
    "duplicate_source" | "invalid_source"
>;

export type RemoveSourceResult = Result<void, "not_found">;

export type GetSourcesResult = Result<MediaSource[]>;

export interface ScanSourceSuccess {
    success: true;
    errors: string[];
}

export type ScanSourceResult = Result<ScanSourceSuccess, "invalid_source">;

export interface TrackResult {
    absolutePath: string;
    track: Track;
    source: MediaSource;
    artist: Artist;
    album: Album;
    albumArtist: AlbumArtist;
    disc: Disc;
    genres: Genre[];
}

export type AbsoluteTrack = Track & { absolutePath: string };

export type GetTrackResult = Result<TrackResult, "not_found">;

export interface GetTracksResult {
    tracks: TrackResult[];
    errors: { trackId: number; error: string }[];
}
