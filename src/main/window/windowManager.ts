import type { Route, WindowRoute } from "@shared/constants/routes";
import type { MainIpcListenEvents, TitleBarControls } from "@shared/types/ipc";
import type { Rectangle } from "electron";

import { join } from "node:path";

import { IpcEmitter } from "@electron-toolkit/typed-ipc/main";
import { is } from "@electron-toolkit/utils";
import { DEFAULT_CONTROLS, WINDOW_POLICIES } from "@main/window/windowPolicies";
import { windowStateManager } from "@main/windowState";
import { BrowserWindow, screen, shell } from "electron";

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
    private debounceTimer: NodeJS.Timeout | null = null;

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
        const window = new BrowserWindow(options);

        window.on("ready-to-show", () => {
            window.show();
            this.applyWindowState(id, window);
        });

        window.on("closed", () => this.removeWindow(id));

        window.webContents.on("will-navigate", (event) =>
            event.preventDefault(),
        );

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

    emitEvent(channel: keyof MainIpcListenEvents, ...args: unknown[]): void {
        for (const info of this.windows.values()) {
            this.emitter.send(
                info.window.webContents,
                channel,
                ...(args as []),
            );
        }
    }

    private updateState(id: string, window: BrowserWindow) {
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
        window.on("enter-full-screen", () => {
            this.emitter.send(window.webContents, "window:onEnterFullscreen");
        });

        window.on("leave-full-screen", () => {
            this.emitter.send(window.webContents, "window:onLeaveFullscreen");
        });

        window.on("maximize", () => {
            this.emitter.send(window.webContents, "window:onMaximize");
            windowStateManager.updateState(id, { isMaximized: true });
        });

        window.on("unmaximize", () => {
            this.emitter.send(window.webContents, "window:onUnmaximize");
            windowStateManager.updateState(id, { isMaximized: false });
        });

        window.on("move", () => this.updateState(id, window));
        window.on("resize", () => this.updateState(id, window));
        window.on("close", () => this.updateState(id, window));
    }

    private validateBounds(bounds: Partial<Rectangle>): Partial<Rectangle> {
        const { x, y, width, height } = bounds;

        if (
            x === undefined ||
            y === undefined ||
            width === undefined ||
            height === undefined
        ) {
            return bounds;
        }

        const displays = screen.getAllDisplays();
        const centerX = x + width / 2;
        const centerY = y + height / 2;

        const targetDisplay = screen.getDisplayNearestPoint({
            x: centerX,
            y: centerY,
        });

        let isVisible = false;
        for (const display of displays) {
            const { x: dx, y: dy, width: dw, height: dh } = display.workArea;

            const intersects =
                x < dx + dw && x + width > dx && y < dy + dh && y + height > dy;

            if (intersects) {
                isVisible = true;
                break;
            }
        }

        if (!isVisible) {
            const workArea = targetDisplay.workArea;
            return {
                x: workArea.x + Math.floor((workArea.width - width) / 2),
                y: workArea.y + Math.floor((workArea.height - height) / 2),
                width,
                height,
            };
        }

        const workArea = targetDisplay.workArea;
        const minVisibleWidth = Math.min(100, width);
        const minVisibleHeight = Math.min(50, height);

        let adjustedX = x;
        let adjustedY = y;

        if (x + width < workArea.x + minVisibleWidth) {
            adjustedX = workArea.x + minVisibleWidth - width;
        } else if (x > workArea.x + workArea.width - minVisibleWidth) {
            adjustedX = workArea.x + workArea.width - minVisibleWidth;
        }

        if (y + height < workArea.y + minVisibleHeight) {
            adjustedY = workArea.y + minVisibleHeight - height;
        } else if (y > workArea.y + workArea.height - minVisibleHeight) {
            adjustedY = workArea.y + workArea.height - minVisibleHeight;
        }

        return {
            x: adjustedX,
            y: adjustedY,
            width,
            height,
        };
    }

    applyWindowState(id: string, window: BrowserWindow): void {
        const savedState = windowStateManager.getState(id);
        if (!savedState) return;

        if (savedState.isMaximized) {
            window.maximize();
            return;
        }

        const bounds = this.validateBounds({
            x: savedState.x,
            y: savedState.y,
            width: savedState.width,
            height: savedState.height,
        });

        window.setBounds({ ...bounds });
    }
}

export const windowManager = new WindowManager();
