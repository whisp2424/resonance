import type { PlaybackState } from "@shared/schema/playback";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
    DEFAULT_PLAYBACK_STATE,
    playbackStateSchema,
} from "@shared/schema/playback";
import { getErrorMessage, log } from "@shared/utils/logger";
import { type } from "arktype";
import { app } from "electron";
import writeFile from "write-file-atomic";

const PLAYBACK_FILE_PATH = join(
    app.getPath("userData"),
    "state",
    "playback.json",
);

class PlaybackManager {
    private playbackCache: PlaybackState = DEFAULT_PLAYBACK_STATE;

    async load(): Promise<PlaybackState> {
        try {
            const rawData = await readFile(PLAYBACK_FILE_PATH, "utf-8");
            const jsonData = JSON.parse(rawData);

            const result = playbackStateSchema(jsonData);
            if (result instanceof type.errors) {
                log(result.summary, "playback", "warning");
                return DEFAULT_PLAYBACK_STATE;
            }

            this.playbackCache = result;
            return this.playbackCache;
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                return DEFAULT_PLAYBACK_STATE;
            }
            log(getErrorMessage(err), "playback", "error");
            return DEFAULT_PLAYBACK_STATE;
        }
    }

    async save(playbackState: PlaybackState): Promise<void> {
        try {
            await writeFile(PLAYBACK_FILE_PATH, JSON.stringify(playbackState), {
                encoding: "utf-8",
            });
            this.playbackCache = { ...playbackState };
        } catch (err) {
            log(getErrorMessage(err), "playback", "error");
        }
    }

    get(): PlaybackState {
        return { ...this.playbackCache };
    }
}

export const playbackManager = new PlaybackManager();
