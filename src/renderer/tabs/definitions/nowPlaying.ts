import NowPlayingView from "@renderer/components/views/NowPlayingView";
import { tabRegistry } from "@renderer/tabs/registry";

import IconMusicNote from "~icons/lucide/music";

export function registerNowPlayingTab(): void {
    tabRegistry.register({
        type: "now-playing",
        singleton: true,
        persistable: true,
        icon: IconMusicNote,
        getComponent: () => NowPlayingView,
        getTitle: () => "Now Playing",
    });
}
