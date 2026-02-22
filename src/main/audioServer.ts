import http from "node:http";

import send from "@fastify/send";
import { library } from "@main/library";
import { getErrorMessage, log } from "@shared/utils/logger";
import Router from "find-my-way";

const router = Router();

let _port: number | null = null;

router.on("GET", "/tracks/:id", async (req, res, params) => {
    const trackId = Number(params.id);

    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET");

    if (isNaN(trackId)) {
        res.writeHead(400).end("Invalid track ID");
        return;
    }

    const result = await library.getTrack(trackId);

    if (!result.success) {
        const status = result.error === "not_found" ? 404 : 500;
        res.writeHead(status).end(result.message);
        return;
    }

    const { statusCode, headers, stream } = await send(
        req,
        result.data.absolutePath,
    );

    res.writeHead(statusCode, headers);
    stream.pipe(res);
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
