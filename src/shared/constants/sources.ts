// for now, we only care about implementing local playback, but the possibility
// to extend later with more sources exists.
export const SOURCE_TYPES = {
    LOCAL: "local",
} as const;

export type SourceType = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];
