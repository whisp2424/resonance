interface TrackStreamOptions {
    sampleRate: number;
    offset?: number;
}

/**
 * A thin client for the audio server. Constructs URLs and provides a clean
 * API for the rest of the audio engine to use without knowing about ports
 * or query parameters.
 */
export class AudioServerClient {
    private readonly baseUrl: string;

    constructor(port: number) {
        this.baseUrl = `http://127.0.0.1:${port}`;
    }

    /**
     * Returns the URL for streaming a track's PCM from the given offset.
     */
    track(id: number, options: TrackStreamOptions): string {
        const params = new URLSearchParams({
            sampleRate: String(options.sampleRate),
            ...(options.offset ? { offset: String(options.offset) } : {}),
        });

        return `${this.baseUrl}/tracks/${id}?${params}`;
    }
}
