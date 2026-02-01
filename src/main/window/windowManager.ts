import type { Route, WindowRoute } from "@shared/constants/routes";
import type { MainIpcListenEvents, TitleBarControls } from "@shared/types/ipc";
import type { Rectangle } from "electron";

import { join } from "node:path";

import { IpcEmitter } from "@electron-toolkit/typed-ipc/main";
import { is } from "@electron-toolkit/utils";
import { validateBounds } from "@main/window/validateBounds";
import { DEFAULT_CONTROLS, WINDOW_POLICIES } from "@main/window/windowPolicies";
import { windowStateManager } from "@main/windowState";
import { BrowserWindow, shell } from "electron";

export type { WebContents } from "electron";

interface WindowProperties {
    window: BrowserWindow;
    route: Route;
    controls: TitleBarControls;
}

class WindowManager {
    private windows = new Map<string, WindowProperties>();
    private hiddenWindows = new Set<string>();
    private debounceTimer: NodeJS.Timeout | null = null;

    emitter = new IpcEmitter<MainIpcListenEvents>();

    addWindow(
        id: string,
        window: BrowserWindow,
        route: Route,
        controls: TitleBarControls,
    ): void {
        this.windows.set(id, { window, route, controls });
        this.registerWindowEvents(id, window);
    }

    removeWindow(id: string): void {
        const info = this.windows.get(id);
        if (!info) return;

        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }

        info.window.removeAllListeners("enter-full-screen");
        info.window.removeAllListeners("leave-full-screen");
        info.window.removeAllListeners("maximize");
        info.window.removeAllListeners("unmaximize");
        this.windows.delete(id);
    }

    getWindow(id: string): BrowserWindow | undefined {
        return this.windows.get(id)?.window;
    }

    getWindowId(webContents: Electron.WebContents): string | null {
        for (const [id, info] of this.windows)
            if (info.window.webContents === webContents) return id;
        return null;
    }

    getControls(id: string): TitleBarControls {
        return { ...DEFAULT_CONTROLS, ...this.windows.get(id)?.controls };
    }

    setControls(id: string, controls: Partial<TitleBarControls>): void {
        const info = this.windows.get(id);
        if (!info) return;
        info.controls = { ...info.controls, ...controls };
    }

    closeWindow(id: string): void {
        this.windows.get(id)?.window.close();
    }

    minimizeWindow(id: string): void {
        this.windows.get(id)?.window.minimize();
    }

    maximizeWindow(id: string): void {
        this.windows.get(id)?.window.maximize();
    }

    unmaximizeWindow(id: string): void {
        this.windows.get(id)?.window.unmaximize();
    }

    isMaximized(id: string): boolean {
        return this.windows.get(id)?.window.isMaximized() ?? false;
    }

    isFullscreen(id: string): boolean {
        return this.windows.get(id)?.window.isFullScreen() ?? false;
    }

    toggleWindows(): void {
        const visibleWindows: BrowserWindow[] = [];
        for (const properties of this.windows.values()) {
            if (properties.window.isVisible())
                visibleWindows.push(properties.window);
        }

        if (visibleWindows.length > 0) {
            for (const window of visibleWindows) {
                for (const [id, properties] of this.windows)
                    if (properties.window === window)
                        this.hiddenWindows.add(id);

                window.hide();
            }
        } else {
            for (const id of this.hiddenWindows)
                this.windows.get(id)?.window.show();

            this.hiddenWindows.clear();
        }
    }

    getTitle(id: string): string {
        return this.windows.get(id)?.window.title ?? "";
    }

    setTitle(id: string, title: string): void {
        const info = this.windows.get(id);
        if (!info) return;
        info.window.title = title;
        this.emitter.send(
            info.window.webContents,
            "window:onWindowTitleChanged",
        );
    }

    createWindow(
        id: string,
        route: WindowRoute,
        parentId?: string,
        customOptions?: Partial<Electron.BrowserWindowConstructorOptions>,
    ): string {
        const existing = this.windows.get(id);

        if (existing) {
            const win = existing.window;
            if (win.isMinimized()) win.restore();
            if (!win.isVisible()) win.show();
            win.focus();
            return id;
        }

        const policy = WINDOW_POLICIES[route];
        if (!policy) throw new Error(`Invalid route: ${route}`);

        const parentWindow = parentId ? this.getWindow(parentId) : undefined;
        const [policyOptions, controls] = policy(parentWindow);

        const options = {
            ...policyOptions,
            ...customOptions,
        };

        const windowState = windowStateManager.getState(id);

        const useSavedPosition = options.movable !== false;
        const useSavedSize = options.resizable !== false;

        const bounds: Partial<Rectangle> = {};

        if (useSavedPosition) {
            bounds.x = windowState?.x;
            bounds.y = windowState?.y;
        }

        if (useSavedSize) {
            bounds.width = windowState?.width;
            bounds.height = windowState?.height;
        }

        const validatedBounds = validateBounds(bounds);
        const windowOptions = {
            ...options,
            x: validatedBounds.x ?? options.x,
            y: validatedBounds.y ?? options.y,
            width: validatedBounds.width ?? options.width,
            height: validatedBounds.height ?? options.height,
        };

        const window = new BrowserWindow(windowOptions);
        this.addWindow(id, window, route, controls);

        window.webContents.setWindowOpenHandler((details) => {
            shell.openExternal(details.url);
            return { action: "deny" };
        });

        const hash = route.replace(/^\//, "");
        if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
            window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#${hash}`);
        } else {
            window.loadFile(join(__dirname, "../renderer/index.html"), {
                hash,
            });
        }

        return id;
    }

    emitEvent(channel: keyof MainIpcListenEvents, ...args: unknown[]): void {
        for (const info of this.windows.values()) {
            this.emitter.send(
                info.window.webContents,
                channel,
                ...(args as []),
            );
        }
    }

    private debounceUpdateState(id: string, window: BrowserWindow) {
        if (this.debounceTimer) clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(async () => {
            this.debounceTimer = null;
            const bounds = window.getNormalBounds();
            const isMaximized = window.isMaximized();
            await windowStateManager.updateState(id, {
                isMaximized,
                ...bounds,
            });
        }, 500);
    }

    private registerWindowEvents(id: string, window: BrowserWindow): void {
        const windowState = windowStateManager.getState(id);

        window.on("ready-to-show", () => {
            window.show();
            if (windowState?.isMaximized) window.maximize();
        });

        window.on("move", () => this.debounceUpdateState(id, window));
        window.on("resize", () => this.debounceUpdateState(id, window));

        window.on("maximize", () => {
            this.emitter.send(window.webContents, "window:onMaximize");
            windowStateManager.updateState(id, { isMaximized: true });
        });

        window.on("unmaximize", () => {
            this.emitter.send(window.webContents, "window:onUnmaximize");
            windowStateManager.updateState(id, { isMaximized: false });
        });

        window.on("close", () => {
            windowStateManager.updateState(id, {
                ...window.getNormalBounds(),
                isMaximized: window.isMaximized(),
            });
        });

        window.on("enter-full-screen", () => {
            this.emitter.send(window.webContents, "window:onEnterFullscreen");
        });

        window.on("leave-full-screen", () => {
            this.emitter.send(window.webContents, "window:onLeaveFullscreen");
        });

        window.on("closed", () => this.removeWindow(id));

        window.webContents.on("will-navigate", (event) =>
            event.preventDefault(),
        );
    }
}

export const windowManager = new WindowManager();
