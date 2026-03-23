import KeepAlive from "@renderer/components/layout/KeepAlive";
import { tabRegistry } from "@renderer/lib/tabs/tabRegistry";
import { useTabsStore } from "@renderer/lib/tabs/tabsStore";

export default function MainView() {
    const { tabs, activeId } = useTabsStore();

    return (
        <div className="flex flex-1 flex-col overflow-hidden">
            <div className="relative flex-1 overflow-hidden">
                {tabs.map((tab) => {
                    const config = tabRegistry[tab.type];
                    const TabContent = config?.component;
                    const isActive = tab.id === activeId;
                    const { params, ...rest } = tab;

                    return (
                        <KeepAlive key={tab.id} active={isActive}>
                            <TabContent {...rest} {...params} />
                        </KeepAlive>
                    );
                })}
            </div>
        </div>
    );
}
