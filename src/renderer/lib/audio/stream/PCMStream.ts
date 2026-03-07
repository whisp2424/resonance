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
 *
 * Supports `for await...of` iteration via `[Symbol.asyncIterator]`.
 */
export class PCMStream {
    private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    private abortController: AbortController | null = null;

    /**
     * Opens the stream to the given URL.
     *
     * @returns Error with code `"not_found"` if the URL returns 404.
     * @returns Error with code `"aborted"` if the stream is aborted before
     *          opening completes.
     */
    async open(
        url: string,
    ): Promise<Result<void, "not_found" | "aborted" | "already_open">> {
        if (this.reader) return error("Stream is already open", "already_open");

        try {
            this.abortController = new AbortController();
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
    async read(): Promise<Result<Uint8Array | null, "not_open" | "aborted">> {
        if (!this.reader) return error("Stream is not open", "not_open");
        try {
            const { value, done } = await this.reader.read();
            if (done) return ok(null);
            return ok(value);
        } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError")
                return error("Stream was aborted", "aborted");
            return error(getErrorMessage(err));
        }
    }

    /** Releases the stream reader without aborting the underlying request. */
    close(): void {
        this.reader?.cancel().catch(() => {});
        this.reader = null;
    }

    /**
     * Cancels the fetch request and releases the stream reader.
     *
     * This method does nothing if called before `open()`.
     */
    abort(): void {
        this.abortController?.abort();
        this.reader?.cancel().catch(() => {});
        this.reader = null;
        this.abortController = null;
    }

    get isOpen(): boolean {
        return this.reader !== null;
    }

    /**
     * Iterates over raw PCM chunks until the stream is exhausted or closed.
     *
     * Intended to be used with `for await...of`:
     * ```ts
     * for await (const chunk of stream) {
     *     ringBuffer.write(chunk);
     * }
     * ```
     *
     * @throws {Error} If a read fails mid-stream. Abort the stream before
     *                 breaking out of the loop early to avoid leaving the
     *                 underlying fetch request open.
     */
    async *[Symbol.asyncIterator](): AsyncGenerator<Uint8Array> {
        if (!this.isOpen) throw new Error("Stream is not open");
        while (this.isOpen) {
            const result = await this.read();
            if (!result.success) throw new Error(result.message);
            if (result.data === null) break;
            yield result.data;
        }
    }
}
