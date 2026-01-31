import type { Route } from "@shared/constants/routes";
import type { TitleBarControls } from "@shared/types/ipc";
import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";

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

const SETTINGS_WINDOW: (
    parent?: BrowserWindow,
) => [BrowserWindowConstructorOptions, TitleBarControls] = () => [
    {
        ...BASE_OPTIONS,
        maximizable: false,
        fullscreenable: false,
        minWidth: 800,
    },
    { ...DEFAULT_CONTROLS },
];

const ADD_SOURCE_WINDOW: (
    parent?: BrowserWindow,
) => [BrowserWindowConstructorOptions, TitleBarControls] = (parent) => [
    {
        ...BASE_OPTIONS,
        maximizable: false,
        fullscreenable: false,
        resizable: false,
        width: 500,
        parent,
        modal: true,
    },
    { ...DEFAULT_CONTROLS },
];

const DIALOG_WINDOW: (
    parent?: BrowserWindow,
) => [BrowserWindowConstructorOptions, TitleBarControls] = () => [
    {
        ...BASE_OPTIONS,
        width: 520,
        height: 160,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
    },
    { minimize: false, maximize: false, close: true },
];

const MODAL_WINDOW: (
    parent?: BrowserWindow,
) => [BrowserWindowConstructorOptions, TitleBarControls] = (parent) => [
    {
        ...BASE_OPTIONS,
        width: 520,
        height: 240,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        parent,
        modal: true,
    },
    { minimize: false, maximize: false, close: true },
];

export const WINDOW_POLICIES: Record<
    Exclude<Route, "*" | "/">,
    (
        parent?: BrowserWindow,
    ) => [BrowserWindowConstructorOptions, TitleBarControls]
> = {
    "/settings": SETTINGS_WINDOW,
    "/add-source": ADD_SOURCE_WINDOW,
    "/dialog": DIALOG_WINDOW,
    "/modal": MODAL_WINDOW,
};
