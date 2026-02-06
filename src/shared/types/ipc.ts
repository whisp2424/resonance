import type { MediaBackend } from "@shared/constants/mediaBackends";
import type { WindowRoute } from "@shared/constants/routes";
import type { Settings } from "@shared/schema/settings";
import type { DialogOptions, DialogResult } from "@shared/types/dialog";
import type {
    AddSourceResult,
    LibraryMediaSource,
} from "@shared/types/library";
import type { DeepPartial, PathInto, PathValue } from "@shared/types/utils";

export type SettingsKey = keyof Settings;
export type SettingsPath = PathInto<Settings>;

export type TitleBarControls = {
    minimize?: boolean;
    maximize?: boolean;
    close?: boolean;
};

export type MainIpcHandleEvents = {
    "app:isDev": () => boolean;
    "app:log": (
        message: string,
        category: string,
        severity: "info" | "warning" | "error",
    ) => void;

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

    "system:getAccentColor": () => string;

    "settings:get": () => Settings;
    "settings:set": (settings: DeepPartial<Settings>) => void;
    "settings:setPath": <P extends SettingsPath>(
        path: P,
        value: PathValue<Settings, P>,
    ) => void;

    "dialog:open": (options: DialogOptions) => DialogResult;
    "dialog:pickFolder": () => string | null;

    "library:addSource": (
        uri: string,
        type: MediaBackend,
        name?: string,
    ) => AddSourceResult;

    "library:getSources": (type?: MediaBackend) => LibraryMediaSource[];
    "library:removeSource": (uri: string, type: MediaBackend) => void;

    "dev:getTables": () => string[];
    "dev:getTableSchema": (table: string) => {
        name: string;
        type: string;
        notnull: number;
        dflt_value: unknown;
        pk: number;
    }[];

    "dev:getTableCount": (table: string) => number;
    "dev:query": (sql: string) => Record<string, unknown>[];
    "dev:delete": (table: string, where: Record<string, unknown>) => void;
};

export type MainIpcListenEvents = {
    "window:onEnterFullscreen": [];
    "window:onLeaveFullscreen": [];
    "window:onMaximize": [];
    "window:onUnmaximize": [];
    "window:onWindowTitleChanged": [];

    "system:onAccentColorChanged": [color: string];

    "settings:onChanged": [settings: Settings, key?: SettingsKey];
    "settings:onError": [message: string];

    "library:onSourcesChanged": [];
};

export type MainIpcEvents = MainIpcHandleEvents | MainIpcListenEvents;
export type RendererIpcEvents = Record<string, unknown>;
