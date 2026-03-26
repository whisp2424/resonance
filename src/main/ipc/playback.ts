import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { playbackStateManager } from "@main/playbackState";

export function registerPlaybackHandlers(
    ipc: IpcListener<MainIpcHandleEvents>,
): void {
    ipc.handle("playback:getState", () => playbackStateManager.get());

    ipc.handle("playback:saveState", async (_event, state) => {
        await playbackStateManager.save(state);
    });
}
