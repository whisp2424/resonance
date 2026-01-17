import type { Route } from "@shared/constants/routes";

export type MainIpcHandleEvents = {
    "window:close": () => void;
    "window:maximize": () => void;
    "window:unmaximize": () => void;
    "window:minimize": () => void;
    "window:isMaximized": () => boolean;
    "window:isFullscreen": () => boolean;
    "window:getTitle": () => string;
    "window:setTitle": (title: string) => void;
    "window:new": (route: Exclude<Route, "*" | "/">) => number;
    "system:accentColor": () => string;
};

export type MainIpcListenEvents = {
    "window:onEnterFullscreen": [];
    "window:onLeaveFullscreen": [];
    "window:onMaximize": [];
    "window:onUnmaximize": [];
    "window:onWindowTitleChanged": [];
    "system:accentColorChanged": [color: string];
};

export type MainIpcEvents = MainIpcHandleEvents | MainIpcListenEvents;
export type RendererIpcEvents = Record<string, unknown>;
