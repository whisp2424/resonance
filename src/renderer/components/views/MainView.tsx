import KeepAlive from "@renderer/components/layout/KeepAlive";
import StatusBar from "@renderer/components/layout/StatusBar";
import { useTabsStore } from "@renderer/lib/state/tabsStore";
import { tabTypeRegistry } from "@renderer/lib/tabRegistry";

export default function MainView() {
    const { tabs, activeId } = useTabsStore();

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="relative flex-1 overflow-hidden">
                {tabs.map((tab) => {
                    const config = tabTypeRegistry[tab.type];
                    const TabContent = config?.component;
                    const isActive = tab.id === activeId;

                    return (
                        <KeepAlive key={tab.id} active={isActive}>
                            <TabContent tab={tab} />
                        </KeepAlive>
                    );
                })}
            </div>
            <StatusBar />
        </div>
    );
}
