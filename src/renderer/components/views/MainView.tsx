import KeepAlive from "@renderer/components/layout/KeepAlive";
import StatusBar from "@renderer/components/layout/StatusBar";
import { useShortcut } from "@renderer/hooks/useShortcut";
import { useTabsStore } from "@renderer/state/tabsStore";
import { initializeTabRegistry } from "@renderer/tabs/definitions";
import { useEffect } from "react";

export default function MainView() {
    const { tabs, activeId, newRestorableTab, restoreTabs } = useTabsStore();

    useShortcut({ code: "Comma", ctrlOrCmd: true }, () => {
        newRestorableTab("settings", {});
    });

    useEffect(() => {
        let isMounted = true;

        (async function init() {
            initializeTabRegistry();
            await restoreTabs();
            if (!isMounted) return;

            const { tabs } = useTabsStore.getState();

            if (tabs.length === 0) newRestorableTab("now-playing", {});
        })();

        return () => {
            isMounted = false;
        };
    }, [restoreTabs, newRestorableTab]);

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
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
            <StatusBar />
        </div>
    );
}
