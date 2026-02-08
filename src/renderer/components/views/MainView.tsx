import KeepAlive from "@renderer/components/layout/KeepAlive";
import NowPlayingView from "@renderer/components/views/NowPlayingView";
import { useShortcut } from "@renderer/hooks/useShortcut";
import { useTabsStore } from "@renderer/state/tabsStore";
import { useEffect } from "react";

import SettingsView from "./SettingsView";

import IconCog from "~icons/lucide/cog";
import IconMusicNote from "~icons/lucide/music";

export default function MainView() {
    const { tabs, activeId, addTab } = useTabsStore();

    useShortcut({ code: "Comma", ctrlOrCmd: true }, () => {
        addTab({
            key: ["settings"],
            title: "Settings",
            icon: IconCog,
            content: SettingsView,
        });
    });

    useEffect(() => {
        addTab({
            key: ["now-playing"],
            title: "Now Playing",
            icon: IconMusicNote,
            content: NowPlayingView,
            closable: false,
        });
    }, [addTab]);

    return (
        <div className="relative flex-1 overflow-hidden">
            {tabs.map((tab) => {
                const TabContent = tab.content;
                const isActive = tab.id === activeId;

                return (
                    <KeepAlive key={tab.id} active={isActive}>
                        <TabContent />
                    </KeepAlive>
                );
            })}
        </div>
    );
}
