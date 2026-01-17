import type { Route } from "@shared/constants/routes";
import type { BrowserWindowConstructorOptions } from "electron";

import { join } from "node:path";

export const BASE_WINDOW = (): BrowserWindowConstructorOptions => ({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 500,
    show: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    backgroundColor: "black",
    webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
    },
});

export const WINDOW_POLICIES: Record<
    Exclude<Route, "*" | "/">,
    () => BrowserWindowConstructorOptions
> = {
    "/settings": BASE_WINDOW,
};
