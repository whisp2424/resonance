import type { IpcListener } from "@electron-toolkit/typed-ipc/main";
import type { MainIpcHandleEvents } from "@shared/types/ipc";

import { playbackManager } from "@main/state/playback";

export function registerPlaybackHandlers(
    ipc: IpcListener<MainIpcHandleEvents>,
) {
    ipc.handle("playback:get", () => {
        return playbackManager.get();
    });

    ipc.handle("playback:set", async (_event, playbackState) => {
        await playbackManager.save(playbackState);
    });
}
