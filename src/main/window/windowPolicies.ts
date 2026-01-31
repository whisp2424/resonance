import type { Route } from "@shared/constants/routes";
import type { TitleBarControls } from "@shared/types/ipc";
import type { BrowserWindowConstructorOptions } from "electron";

import { join } from "node:path";

export const BASE_OPTIONS: BrowserWindowConstructorOptions = {
    minWidth: 500,
    minHeight: 500,
    show: false,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    backgroundColor: "#00000000",
    webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
    },
};

export const DEFAULT_CONTROLS: TitleBarControls = {
    minimize: false,
    maximize: false,
    close: true,
};

const SETTINGS_WINDOW: () => [
    BrowserWindowConstructorOptions,
    TitleBarControls,
] = () => [
    {
        ...BASE_OPTIONS,
        maximizable: false,
        fullscreenable: false,
        minWidth: 800,
    },
    { ...DEFAULT_CONTROLS },
];

const ADD_SOURCE_WINDOW: () => [
    BrowserWindowConstructorOptions,
    TitleBarControls,
] = () => [
    {
        ...BASE_OPTIONS,
        maximizable: false,
        fullscreenable: false,
        resizable: false,
        width: 500,
    },
    { ...DEFAULT_CONTROLS },
];

export const WINDOW_POLICIES: Record<
    Exclude<Route, "*" | "/">,
    () => [BrowserWindowConstructorOptions, TitleBarControls]
> = {
    "/settings": SETTINGS_WINDOW,
    "/add-source": ADD_SOURCE_WINDOW,
};
