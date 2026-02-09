import SettingsView from "@renderer/components/views/SettingsView";
import { tabRegistry } from "@renderer/tabs/registry";

import IconCog from "~icons/lucide/cog";

export function registerSettingsTab(): void {
    tabRegistry.register({
        type: "settings",
        singleton: true,
        persistable: true,
        icon: IconCog,
        getComponent: () => SettingsView,
        getTitle: () => "Settings",
    });
}
