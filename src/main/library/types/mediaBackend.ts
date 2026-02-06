export abstract class MediaBackend {
    /** Unique identifier name for the backend implementation. */
    abstract readonly BACKEND_NAME: string;

    /**
     * Returns a generic name for the media source given a valid URI supported
     * by the backend.
     */
    abstract parseName(uri: string): string;

    /**
     * Validates and ensures the given URI to ensure it is compatible with the
     * media backend.
     */
    abstract validateUri(
        uri: string,
    ): Promise<{ valid: true; uri: string } | { valid: false; error: string }>;
}
