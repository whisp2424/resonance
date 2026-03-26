import { type } from "arktype";

export const repeatModeSchema = type('"off" | "single" | "all"');

export const playbackStateSchema = type({
    queue: "number[]",
    index: "number",
    repeat: repeatModeSchema,
    volume: "number",
    position: "number",
});

export type RepeatMode = typeof repeatModeSchema.infer;
export type PlaybackState = typeof playbackStateSchema.infer;

export const DEFAULT_PLAYBACK_STATE: PlaybackState = {
    queue: [],
    index: -1,
    repeat: "off",
    volume: 1,
    position: 0,
};
