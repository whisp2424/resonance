import { spawn } from "node:child_process";
import http from "node:http";

import { library } from "@main/library";
import { getErrorMessage, log } from "@shared/utils/logger";
import ffmpegPath from "ffmpeg-static";
import Router from "find-my-way";

const router = Router();

let _port: number | null = null;

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
    const sampleRate = Number(url.searchParams.get("sampleRate") || 44100);
    const offset = Number(url.searchParams.get("offset") || 0);
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

    const ffmpeg = spawn(ffmpegPath, args);

    res.writeHead(200, {
        "Content-Type": "audio/pcm",
        "Transfer-Encoding": "chunked",
    });

    ffmpeg.stdout.pipe(res);

    ffmpeg.on("error", (err) => {
        log(getErrorMessage(err), "AudioServer", "error");
        if (!res.headersSent) res.writeHead(500).end(err.message);
    });

    // if the client disconnects mid-stream, kill ffmpeg cleanly
    req.on("close", () => ffmpeg.kill());
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
        server.listen(0, "127.0.0.1", () => {
            const address = server.address() as { port: number };
            _port = address.port;
            log(`server listening on port ${_port}`, "AudioServer");
            resolve(_port);
        });
        server.on("error", (err) => {
            log(getErrorMessage(err), "AudioServer", "error");
            reject(err);
        });
    });
}

export function stopServer(): Promise<void> {
    return new Promise((resolve, reject) => {
        server.close((err) => {
            if (err) {
                log(getErrorMessage(err), "AudioServer", "error");
                reject(err);
            } else {
                log("server stopped", "AudioServer");
                resolve();
            }
        });
    });
}
