import type { ChildProcess } from "node:child_process";

import { spawn } from "node:child_process";
import http from "node:http";

import { library } from "@main/library";
import { getErrorMessage, log } from "@shared/utils/logger";
import ffmpegPath from "ffmpeg-static";
import Router from "find-my-way";

const router = Router();

const DEFAULT_SAMPLE_RATE = 44100;
const MIN_SAMPLE_RATE = 8000;
const MAX_SAMPLE_RATE = 192000;

let _port: number | null = null;
let isStoppingServer = false;

interface ActiveStream {
    process: ChildProcess;
    closeResponse: () => void;
}

const activeStreams = new Set<ActiveStream>();

router.on("GET", "/health", (_, res) => {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(200).end(JSON.stringify({ status: "ok" }));
});

router.on("GET", "/tracks/:id", async (req, res, params) => {
    if (!ffmpegPath) {
        const status = 500;
        res.writeHead(status).end("ffmpeg binary not found");
        return;
    }

    if (!req.url) {
        const status = 400;
        res.writeHead(status).end("Invalid request");
        return;
    }

    const trackId = Number(params.id);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    if (isNaN(trackId)) {
        res.writeHead(400).end("Invalid track ID");
        return;
    }

    const url = new URL(req.url, "http://127.0.0.1");
    const sampleRate = Number(
        url.searchParams.get("sampleRate") || DEFAULT_SAMPLE_RATE,
    );
    const offset = Number(url.searchParams.get("offset") || 0);

    if (!Number.isFinite(sampleRate)) {
        res.writeHead(400).end("Invalid sample rate");
        return;
    }

    if (
        !Number.isInteger(sampleRate) ||
        sampleRate < MIN_SAMPLE_RATE ||
        sampleRate > MAX_SAMPLE_RATE
    ) {
        res.writeHead(400).end("Sample rate out of range");
        return;
    }

    if (!Number.isFinite(offset) || offset < 0) {
        res.writeHead(400).end("Invalid offset");
        return;
    }

    const result = await library.getTrack(trackId);

    if (!result.success) {
        const status = result.error === "not_found" ? 404 : 500;
        res.writeHead(status).end(result.message);
        return;
    }

    const { absolutePath } = result.data;

    const args = [
        // seek to the offset before decoding
        ...(offset > 0 ? ["-ss", String(offset)] : []),

        "-i",
        absolutePath,

        // output raw 32-bit float PCM
        "-f",
        "f32le",

        // resample to the AudioContext's sample rate
        "-ar",
        String(sampleRate),

        // stereo output
        "-ac",
        "2",

        "pipe:1", // write to stdout
    ];

    const ffmpeg = spawn(ffmpegPath, args, {
        stdio: ["ignore", "pipe", "pipe"],
    });

    let didStartStreaming = false;
    let didRequestClose = false;
    let stderrOutput = "";

    function closeResponse(): void {
        if (res.destroyed) return;
        if (!res.headersSent) {
            res.writeHead(204).end();
            return;
        }

        res.destroy();
    }

    const activeStream: ActiveStream = {
        process: ffmpeg,
        closeResponse,
    };

    activeStreams.add(activeStream);

    function cleanupProcess(): void {
        activeStreams.delete(activeStream);
    }

    function closeProcess(): void {
        if (didRequestClose) return;
        didRequestClose = true;

        if (!ffmpeg.killed) ffmpeg.kill();
    }

    ffmpeg.stdout.once("data", (chunk: Buffer) => {
        didStartStreaming = true;

        if (!res.headersSent) {
            res.writeHead(200, {
                "Content-Type": "audio/pcm",
                "Transfer-Encoding": "chunked",
            });
        }

        if (!res.destroyed) res.write(chunk);
        ffmpeg.stdout.pipe(res);
    });

    ffmpeg.stderr.on("data", (chunk: Buffer) => {
        stderrOutput += chunk.toString();
    });

    ffmpeg.on("error", (err) => {
        cleanupProcess();
        if (isStoppingServer || didRequestClose) return;
        log(getErrorMessage(err), "AudioServer", "error");
        if (!res.headersSent) res.writeHead(500).end(err.message);
    });

    ffmpeg.on("close", (code, signal) => {
        cleanupProcess();

        if (didRequestClose || isStoppingServer) return;

        if (code !== 0 && !didStartStreaming) {
            const message = stderrOutput.trim() || "Audio decode failed";

            if (!res.headersSent) {
                res.writeHead(500).end(message);
            } else if (!res.destroyed) {
                res.destroy(new Error(message));
            }

            log(
                `ffmpeg exited before streaming (code: ${String(code)}, signal: ${String(signal)}): ${message}`,
                "AudioServer",
                "error",
            );
            return;
        }

        if (!didStartStreaming) {
            if (!res.headersSent) {
                res.writeHead(204).end();
            } else if (!res.destroyed) {
                res.end();
            }

            return;
        }

        if (code !== 0) {
            const message = stderrOutput.trim() || "Audio decode failed";
            log(
                `ffmpeg exited during streaming (code: ${String(code)}, signal: ${String(signal)}): ${message}`,
                "AudioServer",
                "warning",
            );

            if (!res.destroyed) res.destroy(new Error(message));
        }
    });

    // if the client disconnects mid-stream, kill ffmpeg cleanly
    req.on("close", closeProcess);
    res.on("close", closeProcess);
    res.on("error", closeProcess);
});

const server = http.createServer((req, res) => {
    router.lookup(req, res);
});

export function getPort(): number {
    if (_port === null) throw new Error("Audio server is not running");
    return _port;
}

export function startServer(): Promise<number> {
    return new Promise((resolve, reject) => {
        const handleError = (err: Error) => {
            log(getErrorMessage(err), "AudioServer", "error");
            reject(err);
        };

        server.once("error", handleError);
        server.listen(0, "127.0.0.1", () => {
            server.removeListener("error", handleError);
            const address = server.address() as { port: number };
            isStoppingServer = false;
            _port = address.port;
            log(`server listening on port ${_port}`, "AudioServer");
            resolve(_port);
        });
    });
}

export function stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        isStoppingServer = true;

        for (const stream of activeStreams) {
            stream.closeResponse();
            if (!stream.process.killed) stream.process.kill();
        }

        server.close((err) => {
            if (err) {
                isStoppingServer = false;
                log(getErrorMessage(err), "AudioServer", "error");
                reject(err);
            } else {
                _port = null;
                isStoppingServer = false;
                log("server stopped", "AudioServer");
                resolve();
            }
        });
    });
}
