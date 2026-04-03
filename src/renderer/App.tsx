import TitleBar from "@renderer/components/layout/titlebar";
import AddSourceView from "@renderer/components/views/AddSourceView";
import AudioInfoView from "@renderer/components/views/AudioInfoView";
import MainView from "@renderer/components/views/MainView";
import { useOperatingSystem } from "@renderer/hooks/useOperatingSystem";
import {
    restorePlaybackState,
    usePlaybackPersistence,
} from "@renderer/hooks/usePlaybackPersistence";
import { useQueueStore } from "@renderer/lib/audio/state/queueStore";
import {
    useThemeListeners,
    useThemeStore,
} from "@renderer/lib/settings/themeStore";
import { useTabsStore } from "@renderer/lib/tabs/tabsStore";
import { ROUTES } from "@shared/constants/routes";
import { log } from "@shared/utils/logger";
import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";

export default function App() {
    const { data: os } = useOperatingSystem();
    const { restoreTabs } = useTabsStore();
    const { initialize: initializeTheme } = useThemeStore();
    const restoreQueue = useQueueStore((state) => state.restore);

    usePlaybackPersistence();

    useEffect(() => {
        restoreTabs();
        initializeTheme();

        restorePlaybackState().then((result) => {
            if (!result.success) {
                log(result.message, "restorePlaybackState", "error");
                return;
            }

            if (result.data.queueTrackIds.length > 0) {
                restoreQueue({
                    trackIds: result.data.queueTrackIds,
                    currentEntryIndex: result.data.currentEntryIndex,
                    positionMs: result.data.positionMs,
                });
            }
        });
    }, [initializeTheme, restoreTabs, restoreQueue]);

    useThemeListeners();

    useEffect(() => {
        if (os?.name) document.documentElement.dataset.os = os.name;
    }, [os]);

    return (
        <div className="flex h-dvh w-full flex-col">
            <TitleBar />
            <Routes>
                <Route path={ROUTES.HOME} element={<MainView />} />
                <Route path={ROUTES.ADD_SOURCE} element={<AddSourceView />} />
                <Route path={ROUTES.AUDIO_INFO} element={<AudioInfoView />} />
                <Route path={ROUTES.NOT_FOUND} element={null} />
            </Routes>
        </div>
    );
}
