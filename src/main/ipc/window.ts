import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { windowManager } from "@main/window/windowManager";

export function registerWindowHandlers(ipc: IpcListener<MainIpcHandleEvents>) {
    ipc.handle("window:close", (_, id) => {
        windowManager.closeWindow(id);
    });

    ipc.handle("window:maximize", (_, id) => {
        windowManager.maximizeWindow(id);
    });

    ipc.handle("window:unmaximize", (_, id) => {
        windowManager.unmaximizeWindow(id);
    });

    ipc.handle("window:minimize", (_, id) => {
        windowManager.minimizeWindow(id);
    });

    ipc.handle("window:isMaximized", (_, id) => {
        return windowManager.isMaximized(id);
    });

    ipc.handle("window:isFullscreen", (_, id) => {
        return windowManager.isFullscreen(id);
    });

    ipc.handle("window:getTitle", (_, id) => {
        return windowManager.getTitle(id);
    });

    ipc.handle("window:setTitle", (_, id, title) => {
        windowManager.setTitle(id, title);
    });

    ipc.handle("window:new", (event, route, id) => {
        const parentId = windowManager.getWindowId(event.sender);
        return windowManager.createWindow(id, route, parentId ?? undefined);
    });

    ipc.handle("window:getId", (event) => {
        return windowManager.getWindowId(event.sender);
    });

    ipc.handle("window:getControls", (_, id) => {
        return windowManager.getControls(id);
    });
}
