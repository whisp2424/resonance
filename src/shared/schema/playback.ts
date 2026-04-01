import { type } from "arktype";

export const playbackStateSchema = type({
    isPlaying: "boolean",
    positionMs: "number",
    volume: "number",
    queueTrackIds: "number[]",
    currentEntryIndex: "number",
});

export type PlaybackState = typeof playbackStateSchema.infer;

export const DEFAULT_PLAYBACK_STATE: PlaybackState = {
    isPlaying: false,
    positionMs: 0,
    volume: 1,
    queueTrackIds: [],
    currentEntryIndex: -1,
};
