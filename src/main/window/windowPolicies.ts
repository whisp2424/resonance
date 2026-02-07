import type { Route } from "@shared/constants/routes";
import type { TitleBarControls } from "@shared/types/ipc";
import type { BrowserWindow, BrowserWindowConstructorOptions } from "electron";

import { join } from "node:path";

type WindowPolicy = (
    parent?: BrowserWindow,
) => [BrowserWindowConstructorOptions, TitleBarControls];

export const DEFAULT_OPTIONS: BrowserWindowConstructorOptions = {
    minWidth: 500,
    minHeight: 500,
    titleBarStyle: "hidden",
    titleBarOverlay: false,
    backgroundColor: "#00000000",
    show: false,
    webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
    },
};

export const DEFAULT_CONTROLS: TitleBarControls = {
    minimize: false,
    maximize: false,
    close: true,
};

const createPolicy = (
    options: BrowserWindowConstructorOptions,
    controls: Partial<TitleBarControls> = {},
): WindowPolicy => {
    return function (parent) {
        return [
            {
                ...DEFAULT_OPTIONS,
                ...options,
                ...(parent ? { parent } : {}),
            },
            { ...DEFAULT_CONTROLS, ...controls },
        ];
    };
};

export const WINDOW_POLICIES: Record<
    Exclude<Route, "*" | "/">,
    WindowPolicy
> = {
    "/add-source": createPolicy({
        width: 500,
        height: 500,
        minWidth: undefined,
        minHeight: undefined,
        fullscreenable: false,
        maximizable: false,
        resizable: false,
        modal: true,
    }),
};
