export abstract class MediaBackend {
    /** Unique identifier name for the backend implementation. */
    abstract readonly BACKEND_NAME: string;

    /**
     * Parses the URI and generates a readable name for a media source based
     * from the URI.
     */
    abstract parseName(uri: string): string;

    /**
     * Validates the URI to ensure it is correct and compatible with the
     * backend.
     */
    abstract validateUri(
        uri: string,
    ): Promise<{ valid: true } | { valid: false; error: string }>;
}
