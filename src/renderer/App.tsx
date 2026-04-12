import TitleBar from "@renderer/components/layout/titlebar";
import AddSourceView from "@renderer/components/views/AddSourceView";
import AudioInfoView from "@renderer/components/views/AudioInfoView";
import MainView from "@renderer/components/views/MainView";
import { useOperatingSystem } from "@renderer/hooks/useOperatingSystem";
import {
    restorePlaybackState,
    usePlaybackPersistence,
} from "@renderer/hooks/usePlaybackPersistence";
import { usePlaybackStore } from "@renderer/lib/audio/state/playbackStore";
import { useQueueStore } from "@renderer/lib/audio/state/queueStore";
import { useSettingsStore } from "@renderer/lib/settings/settingsStore";
import {
    useThemeListeners,
    useThemeStore,
} from "@renderer/lib/settings/themeStore";
import { useTabsStore } from "@renderer/lib/tabs/tabsStore";
import { ROUTES } from "@shared/constants/routes";
import { log } from "@shared/utils/logger";
import { useEffect, useRef } from "react";
import { Route, Routes } from "react-router-dom";

export default function App() {
    const { data: os } = useOperatingSystem();
    const { restoreTabs } = useTabsStore();
    const { initialize: initializeTheme } = useThemeStore();
    const restoreQueue = useQueueStore((state) => state.restore);

    const resumePlaybackOnStartup = useSettingsStore(
        (state) => state.settings?.audio.playback.resumeOnStartup,
    );

    const didRestorePlayback = useRef(false);
    usePlaybackPersistence();

    useEffect(() => {
        restoreTabs();
        initializeTheme();
    }, [initializeTheme, restoreTabs]);

    useEffect(() => {
        if (resumePlaybackOnStartup === undefined || didRestorePlayback.current)
            return;

        async function restorePersistedPlayback(): Promise<void> {
            const result = await restorePlaybackState();

            if (!result.success) {
                log(result.message, "restorePlaybackState", "error");
                return;
            }

            if (result.data.queueTrackIds.length > 0) {
                await restoreQueue({
                    trackIds: result.data.queueTrackIds,
                    currentEntryIndex: result.data.currentEntryIndex,
                    positionMs: result.data.positionMs,
                });
            }

            if (resumePlaybackOnStartup && result.data.isPlaying)
                await usePlaybackStore.getState().play();

            didRestorePlayback.current = true;
        }

        restorePersistedPlayback();
    }, [restoreQueue, resumePlaybackOnStartup]);

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
