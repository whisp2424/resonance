import type { Route } from "@shared/constants/routes";
import type { TitleBarControls } from "@shared/types/ipc";
import type { BrowserWindowConstructorOptions } from "electron";

import { join } from "node:path";

export const BASE_OPTIONS: BrowserWindowConstructorOptions = {
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
};

export const DEFAULT_CONTROLS: TitleBarControls = {
    minimize: true,
    maximize: true,
    close: true,
};

export const SETTINGS_WINDOW: () => [
    BrowserWindowConstructorOptions,
    TitleBarControls,
] = () => [
    {
        ...BASE_OPTIONS,
        fullscreenable: false,
        width: 700,
        height: 600,
    },
    {
        minimize: false,
        maximize: false,
    },
];

export const WINDOW_POLICIES: Record<
    Exclude<Route, "*" | "/">,
    () => [BrowserWindowConstructorOptions, TitleBarControls]
> = {
    "/settings": SETTINGS_WINDOW,
};
