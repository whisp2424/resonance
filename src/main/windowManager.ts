import type { WindowRoute } from "@shared/constants/routes";
import type { MainIpcListenEvents, TitleBarControls } from "@shared/types/ipc";

import { join } from "node:path";

import { IpcEmitter } from "@electron-toolkit/typed-ipc/main";
import { is } from "@electron-toolkit/utils";
import { DEFAULT_CONTROLS, WINDOW_POLICIES } from "@main/windowPolicies";
import { BrowserWindow, shell } from "electron";

export type { WebContents } from "electron";

interface WindowInfo {
    window: BrowserWindow;
    route: WindowRoute | "/";
    controls: TitleBarControls;
}

class WindowManager {
    emitter = new IpcEmitter<MainIpcListenEvents>();
    private windows = new Map<string, WindowInfo>();

    addWindow(
        id: string,
        window: BrowserWindow,
        route: WindowRoute | "/",
        controls: TitleBarControls,
    ): void {
        this.windows.set(id, { window, route, controls });
        this.registerWindowEvents(window);
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
        if (this.windows.has(id))
            throw new Error(`Window "${id}" already exists`);

        const policy = WINDOW_POLICIES[route];
        if (!policy) throw new Error(`Invalid route: ${route}`);

        const [options, controls] = policy();
        const window = new BrowserWindow(options);

        window.on("ready-to-show", () => window.show());
        window.on("closed", () => this.removeWindow(id));
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

    private registerWindowEvents(window: BrowserWindow): void {
        window.on("enter-full-screen", () => {
            this.emitter.send(window.webContents, "window:onEnterFullscreen");
        });

        window.on("leave-full-screen", () => {
            this.emitter.send(window.webContents, "window:onLeaveFullscreen");
        });

        window.on("maximize", () => {
            this.emitter.send(window.webContents, "window:onMaximize");
        });

        window.on("unmaximize", () => {
            this.emitter.send(window.webContents, "window:onUnmaximize");
        });
    }
}

export const windowManager = new WindowManager();
