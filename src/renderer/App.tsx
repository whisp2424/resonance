import TitleBar from "@renderer/components/layout/titlebar";
import AddSourceView from "@renderer/components/views/AddSourceView";
import MainView from "@renderer/components/views/MainView";
import NotFound from "@renderer/components/views/NotFound";
import { useOperatingSystem } from "@renderer/hooks/useOperatingSystem";
import {
    initializeThemeListeners,
    useThemeStore,
} from "@renderer/lib/state/themeStore";
import { ROUTES } from "@shared/constants/routes";
import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";

export default function App() {
    const { data: os } = useOperatingSystem();
    const { initialize: initializeTheme } = useThemeStore();

    useEffect(() => {
        initializeTheme();
        const unsubscribe = initializeThemeListeners();

        return () => {
            unsubscribe();
        };
    }, [initializeTheme]);

    useEffect(() => {
        if (os?.name) document.documentElement.dataset.os = os.name;
    }, [os]);

    return (
        <div className="flex h-dvh w-full flex-col">
            <TitleBar />
            <Routes>
                <Route path={ROUTES.HOME} element={<MainView />} />
                <Route path={ROUTES.ADD_SOURCE} element={<AddSourceView />} />
                <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
        </div>
    );
}
