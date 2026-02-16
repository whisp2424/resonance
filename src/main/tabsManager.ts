import type { TabDescriptor } from "@shared/types/tabs";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { tabDescriptorSchema } from "@shared/schema/tabs";
import { getErrorMessage, log } from "@shared/utils/logger";
import { type } from "arktype";
import { app } from "electron";
import writeFile from "write-file-atomic";

const TABS_FILE = join(app.getPath("userData"), "tabs.json");

const tabsSchema = tabDescriptorSchema.array();

interface TabsState {
    tabs: TabDescriptor[];
    activeId: string | null;
}

class TabsManager {
    private tabsCache: TabDescriptor[] | null = null;
    private activeIdCache: string | null = null;

    async load(): Promise<TabsState | null> {
        try {
            const rawData = await readFile(TABS_FILE, "utf-8");
            const jsonData = JSON.parse(rawData);

            const tabsResult = tabsSchema(jsonData.tabs);
            if (tabsResult instanceof type.errors) {
                log(tabsResult.summary, "tabs", "warning");
                return null;
            }

            this.tabsCache = tabsResult;
            this.activeIdCache = jsonData.activeId ?? null;

            return {
                tabs: this.tabsCache,
                activeId: this.activeIdCache,
            };
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
            log(getErrorMessage(err), "tabs", "error");
            return null;
        }
    }

    async save(tabs: TabDescriptor[], activeId: string | null): Promise<void> {
        try {
            await writeFile(TABS_FILE, JSON.stringify({ tabs, activeId }), {
                encoding: "utf-8",
            });
            this.tabsCache = [...tabs];
            this.activeIdCache = activeId;
        } catch (err) {
            log(getErrorMessage(err), "tabs", "error");
        }
    }

    get(): TabsState | null {
        if (!this.tabsCache) return null;
        return {
            tabs: this.tabsCache,
            activeId: this.activeIdCache,
        };
    }
}

export const tabsManager = new TabsManager();
