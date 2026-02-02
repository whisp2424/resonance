// for now, we only care about implementing local playback, but the possibility
// to extend later with more sources exists.
export const MEDIA_BACKENDS = {
    LOCAL: "local",
} as const;

export type MediaBackend = (typeof MEDIA_BACKENDS)[keyof typeof MEDIA_BACKENDS];
