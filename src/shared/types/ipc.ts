import type { WindowRoute } from "@shared/constants/routes";

export type TitleBarControls = {
    minimize?: boolean;
    maximize?: boolean;
    close?: boolean;
};

export type MainIpcHandleEvents = {
    "window:close": (id: string) => void;
    "window:maximize": (id: string) => void;
    "window:unmaximize": (id: string) => void;
    "window:minimize": (id: string) => void;
    "window:isMaximized": (id: string) => boolean;
    "window:isFullscreen": (id: string) => boolean;
    "window:getTitle": (id: string) => string;
    "window:setTitle": (id: string, title: string) => void;
    "window:new": (route: WindowRoute, id: string) => string;
    "window:getId": () => string | null;
    "window:getControls": (id: string) => TitleBarControls;
    "system:accentColor": () => string;
    "system:darkMode": () => boolean;
};

export type MainIpcListenEvents = {
    "window:onEnterFullscreen": [];
    "window:onLeaveFullscreen": [];
    "window:onMaximize": [];
    "window:onUnmaximize": [];
    "window:onWindowTitleChanged": [];
    "system:accentColorChanged": [color: string];
    "system:darkModeChanged": [isDark: boolean];
};

export type MainIpcEvents = MainIpcHandleEvents | MainIpcListenEvents;
export type RendererIpcEvents = Record<string, unknown>;
