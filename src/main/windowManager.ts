import type { Route, WindowRoute } from "@shared/constants/routes";
import type { MainIpcListenEvents, TitleBarControls } from "@shared/types/ipc";

import { join } from "node:path";

import { IpcEmitter } from "@electron-toolkit/typed-ipc/main";
import { is } from "@electron-toolkit/utils";
import { debounce } from "@main/utils/debounce";
import { DEFAULT_CONTROLS, WINDOW_POLICIES } from "@main/windowPolicies";
import { getWindowState, updateWindowState } from "@main/windowState";
import { BrowserWindow, shell } from "electron";

export type { WebContents } from "electron";

interface WindowProperties {
    window: BrowserWindow;
    route: Route;
    controls: TitleBarControls;
}

class WindowManager {
    emitter = new IpcEmitter<MainIpcListenEvents>();
    private windows = new Map<string, WindowProperties>();
    private hiddenWindows = new Set<string>();

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

    closeWindow(id: string): void {
        const info = this.windows.get(id);
        info?.window.close();
    }

    minimizeWindow(id: string): void {
        const info = this.windows.get(id);
        info?.window.minimize();
    }

    maximizeWindow(id: string): void {
        const info = this.windows.get(id);
        info?.window.maximize();
    }

    unmaximizeWindow(id: string): void {
        const info = this.windows.get(id);
        info?.window.unmaximize();
    }

    isMaximized(id: string): boolean {
        const info = this.windows.get(id);
        return info?.window.isMaximized() ?? false;
    }

    isFullscreen(id: string): boolean {
        const info = this.windows.get(id);
        return info?.window.isFullScreen() ?? false;
    }

    toggleWindows(): void {
        const visibleWindows: BrowserWindow[] = [];
        for (const properties of this.windows.values()) {
            if (properties.window.isVisible())
                visibleWindows.push(properties.window);
        }

        if (visibleWindows.length > 0) {
            for (const window of visibleWindows) {
                for (const [id, properties] of this.windows) {
                    if (properties.window === window)
                        this.hiddenWindows.add(id);
                }

                window.hide();
            }
        } else {
            for (const id of this.hiddenWindows) {
                const properties = this.windows.get(id);
                properties?.window.show();
            }

            this.hiddenWindows.clear();
        }
    }

    getTitle(id: string): string {
        const info = this.windows.get(id);
        return info?.window.title ?? "";
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

    emitEvent(channel: keyof MainIpcListenEvents, ...args: unknown[]): void {
        for (const info of this.windows.values()) {
            this.emitter.send(
                info.window.webContents,
                channel,
                ...(args as [] | [string]),
            );
        }
    }

    createWindow(id: string, route: WindowRoute): string {
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

        const [options, controls] = policy();
        const savedState = getWindowState(id);

        if (savedState) {
            const { x, y, width, height } = savedState;

            if (x !== undefined && y !== undefined) {
                options.x = x;
                options.y = y;
            }

            if (width !== undefined && height !== undefined) {
                options.width = width;
                options.height = height;
            }
        }

        const window = new BrowserWindow(options);

        window.on("ready-to-show", () => {
            if (savedState?.isMaximized) {
                window.maximize();
            }
            if (savedState?.isFullscreen) {
                window.setFullScreen(true);
            }
            window.show();
        });

        window.on("closed", () => this.removeWindow(id));
        window.on("close", () => {
            updateWindowState(id, {
                ...window.getBounds(),
                isFullscreen: window.isFullScreen(),
                isMaximized: window.isMaximized(),
            });
        });

        window.webContents.on("will-navigate", (event) =>
            event.preventDefault(),
        );

        window.webContents.on("did-fail-load", () => {
            this.removeWindow(id);
            throw new Error(`Failed to load route: ${route}`);
        });

        window.webContents.setWindowOpenHandler((details) => {
            shell.openExternal(details.url);
            return { action: "deny" };
        });

        const hash = route.replace(/^\//, "");
        if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
            window.loadURL(`${process.env["ELECTRON_RENDERER_URL"]}#${hash}`);
        } else {
            window.loadFile(join(__dirname, "../renderer/index.html"), {
                hash: hash,
            });
        }

        this.addWindow(id, window, route, controls);
        return id;
    }

    private registerWindowEvents(id: string, window: BrowserWindow): void {
        window.on("enter-full-screen", () => {
            this.emitter.send(window.webContents, "window:onEnterFullscreen");
            updateWindowState(id, { isFullscreen: true });
        });

        window.on("leave-full-screen", () => {
            this.emitter.send(window.webContents, "window:onLeaveFullscreen");
            updateWindowState(id, { isFullscreen: false });
        });

        window.on("maximize", () => {
            this.emitter.send(window.webContents, "window:onMaximize");
            updateWindowState(id, { isMaximized: true });
        });

        window.on("unmaximize", () => {
            this.emitter.send(window.webContents, "window:onUnmaximize");
            updateWindowState(id, { isMaximized: false });
        });

        const updateBounds = debounce(() => {
            try {
                updateWindowState(id, { ...window.getBounds() });
            } catch {}
        }, 500);

        window.on("move", updateBounds);
        window.on("resize", updateBounds);
    }
}

export const windowManager = new WindowManager();
