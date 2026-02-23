import type { Result } from "@shared/types/result";

import { error, ok } from "@shared/types/result";
import { getErrorMessage } from "@shared/utils/logger";

/**
 * Opens a streaming HTTP connection to the audio server and reads raw PCM
 * bytes chunk by chunk.
 *
 * It pulls chunks on demand rather than having them pushed — this gives us
 * natural back pressure. If the ring buffer is full, we simply stop pulling
 * until there's space, without accumulating data in memory.
 */
export class PCMStream {
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private abortController = new AbortController();

    async open(url: string): Promise<Result<void, "not_found" | "aborted">> {
        try {
            const response = await fetch(url, {
                signal: this.abortController.signal,
            });

            if (response.status === 404)
                return error("The requested track does not exist", "not_found");

            if (!response.ok)
                return error(`Server responded with ${response.status}`);

            if (!response.body) return error("Response body is empty");

            this.reader = response.body.getReader();
            return ok(undefined);
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError")
                return error("Stream was aborted", "aborted");
            return error(getErrorMessage(err));
        }
    }

    /**
     * Reads the next chunk of raw bytes from the stream.
     *
     * Returns null when the stream is exhausted — the track has fully decoded.
     */
    async read(): Promise<Uint8Array | null> {
        if (!this.reader) throw new Error("Stream is not open");
        const { value, done } = await this.reader.read();
        if (done) return null;
        return value ?? null;
    }

    /** Cancels the fetch request and releases the stream reader. */
    abort(): void {
        this.abortController.abort();
        this.reader?.cancel();
        this.reader = null;
    }
}
