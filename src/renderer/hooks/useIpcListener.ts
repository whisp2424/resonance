import type { MainIpcListenEvents } from "@shared/types/ipc";

import { useEffect } from "react";

export function useIpcListener<K extends keyof MainIpcListenEvents>(
    channel: K,
    listener: (...args: MainIpcListenEvents[K]) => void,
): void {
    useEffect(() => {
        return electron.send(channel, listener);
    }, [channel, listener]);
}
