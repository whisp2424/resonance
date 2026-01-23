import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { type } from "arktype";
import { app } from "electron";
import writeFile from "write-file-atomic";

export const windowStateSchema = type({
    "x?": "number",
    "y?": "number",
    "width?": "number",
    "height?": "number",
    "isMaximized?": "boolean",
});

export type WindowState = typeof windowStateSchema.infer;

const WINDOW_STATE_FILE = join(app.getPath("userData"), "window-state.json");

type WindowStates = Record<string, WindowState>;

class WindowStateManager {
    private stateCache: WindowStates = {};

    async load(): Promise<WindowStates> {
        let rawData: string;

        try {
            rawData = await readFile(WINDOW_STATE_FILE, "utf-8");
        } catch {
            this.stateCache = {};
            return this.stateCache;
        }

        try {
            const jsonData = JSON.parse(rawData);
            const result = windowStateSchema(jsonData);

            if (result instanceof type.errors) {
                this.stateCache = {};
                return this.stateCache;
            }

            this.stateCache = result as WindowStates;
            return this.stateCache;
        } catch {
            this.stateCache = {};
            return this.stateCache;
        }
    }

    async write(state: WindowStates): Promise<void> {
        await writeFile(WINDOW_STATE_FILE, JSON.stringify(state, null, 0), {
            encoding: "utf-8",
        });

        this.stateCache = { ...state };
    }

    async updateBoundsState(
        id: string,
        bounds: { x?: number; y?: number; width?: number; height?: number },
    ): Promise<void> {
        const current = this.stateCache[id] ?? {};
        const updated = { ...current, ...bounds };
        const newState = { ...this.stateCache, [id]: updated };
        await this.write(newState);
    }

    async updateMaximizedState(
        id: string,
        isMaximized: boolean,
    ): Promise<void> {
        const current = this.stateCache[id] ?? {};
        const updated = { ...current, isMaximized };
        const newState = { ...this.stateCache, [id]: updated };
        await this.write(newState);
    }

    getState(id: string): WindowState | undefined {
        return this.stateCache[id];
    }
}

export const windowStateManager = new WindowStateManager();
