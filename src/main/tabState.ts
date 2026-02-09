import type { TabState } from "@shared/schema/tabState";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { tabStateSchema } from "@shared/schema/tabState";
import { getErrorMessage, log } from "@shared/utils/logger";
import { type } from "arktype";
import { app } from "electron";
import writeFile from "write-file-atomic";

const TAB_STATE_FILE = join(app.getPath("userData"), "tabs.json");

class TabStateManager {
    private cache: TabState | null = null;

    private async write(state: TabState): Promise<void> {
        await writeFile(TAB_STATE_FILE, JSON.stringify(state, null, 0), {
            encoding: "utf-8",
        });

        this.cache = { ...state };
    }

    async load(): Promise<TabState | null> {
        let raw: string;

        try {
            raw = await readFile(TAB_STATE_FILE, "utf-8");
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                this.cache = null;
                return null;
            }

            log(
                `failed to load tab state: ${getErrorMessage(err)}`,
                "TabStateManager",
                "warning",
            );
            return null;
        }

        try {
            const json = JSON.parse(raw);
            const result = tabStateSchema(json);

            if (result instanceof type.errors) {
                log(
                    `invalid tab state: ${result.summary}`,
                    "TabStateManager",
                    "warning",
                );
                this.cache = null;
                return null;
            }

            this.cache = result;
            return this.cache;
        } catch (err) {
            log(
                `failed to parse tab state: ${getErrorMessage(err)}`,
                "TabStateManager",
                "warning",
            );
            return null;
        }
    }

    async save(state: TabState): Promise<void> {
        const validated = tabStateSchema(state);
        if (validated instanceof type.errors) {
            log(
                `invalid tab state: ${validated.summary}`,
                "TabStateManager",
                "warning",
            );
            return;
        }
        try {
            await this.write(validated);
        } catch (err) {
            log(
                `failed to save tab state: ${getErrorMessage(err)}`,
                "TabStateManager",
                "warning",
            );
        }
    }

    get(): TabState | null {
        return this.cache;
    }
}

export const tabStateManager = new TabStateManager();
