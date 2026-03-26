import type { PlaybackState } from "@shared/schema/playback";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
    DEFAULT_PLAYBACK_STATE,
    playbackStateSchema,
} from "@shared/schema/playback";
import { type } from "arktype";
import { app } from "electron";
import writeFile from "write-file-atomic";

const PLAYBACK_STATE_FILE = join(app.getPath("userData"), "playback.json");

class PlaybackStateManager {
    private stateCache: PlaybackState = DEFAULT_PLAYBACK_STATE;

    async load(): Promise<PlaybackState> {
        let rawData: string;

        try {
            rawData = await readFile(PLAYBACK_STATE_FILE, "utf-8");
        } catch {
            this.stateCache = DEFAULT_PLAYBACK_STATE;
            return this.stateCache;
        }

        try {
            const jsonData = JSON.parse(rawData);
            const result = playbackStateSchema(jsonData);

            if (result instanceof type.errors) {
                this.stateCache = DEFAULT_PLAYBACK_STATE;
                return this.stateCache;
            }

            this.stateCache = result;
            return this.stateCache;
        } catch {
            this.stateCache = DEFAULT_PLAYBACK_STATE;
            return this.stateCache;
        }
    }

    get(): PlaybackState {
        return this.stateCache;
    }

    async save(state: PlaybackState): Promise<void> {
        const result = playbackStateSchema(state);

        if (result instanceof type.errors) return;

        this.stateCache = result;

        await writeFile(PLAYBACK_STATE_FILE, JSON.stringify(result), {
            encoding: "utf-8",
        });
    }
}

export const playbackStateManager = new PlaybackStateManager();
