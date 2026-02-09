import { registerNowPlayingTab } from "@renderer/tabs/definitions/nowPlaying";
import { registerSettingsTab } from "@renderer/tabs/definitions/settings";

let initialized = false;

export function initializeTabRegistry(): void {
    if (initialized) return;
    initialized = true;
    registerNowPlayingTab();
    registerSettingsTab();
}
