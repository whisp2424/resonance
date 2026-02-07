import NowPlayingView from "@renderer/components/views/NowPlayingView";
import { useTabsStore } from "@renderer/state/tabsStore";
import { useEffect } from "react";

import IconMusicNote from "~icons/lucide/music";

export default function MainView() {
    const { tabs, activeKeyHash, addTab } = useTabsStore();

    const activeTab = tabs.find((tab) => tab.keyHash === activeKeyHash);
    const TabView = activeTab?.content;

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
        <div className="flex-1 overflow-hidden">
            {TabView ? <TabView /> : null}
        </div>
    );
}
