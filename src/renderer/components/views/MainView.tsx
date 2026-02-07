import NowPlayingView from "@renderer/components/views/NowPlayingView";
import { useTabsStore } from "@renderer/state/tabsStore";
import { useEffect, useRef } from "react";

import IconMusicNote from "~icons/lucide/music";

export default function MainView() {
    const { tabs, activeTabId, addTab } = useTabsStore();
    const initializedRef = useRef(false);

    const activeTab = tabs.find((tab) => tab.id === activeTabId);
    const TabView = activeTab?.content;

    useEffect(() => {
        if (!initializedRef.current && tabs.length === 0) {
            initializedRef.current = true;
            addTab({
                title: "Now Playing",
                icon: IconMusicNote,
                content: NowPlayingView,
                closable: false,
            });
        }
    }, [addTab, tabs.length]);

    return (
        <div className="flex-1 overflow-hidden">
            {TabView ? <TabView /> : null}
        </div>
    );
}
