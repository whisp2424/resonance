import TitleBar from "@renderer/components/layout/TitleBar";
import AddSourceView from "@renderer/components/views/AddSourceView";
import HomeView from "@renderer/components/views/HomeView";
import MissingSourcesView from "@renderer/components/views/MissingSourcesView";
import NotFound from "@renderer/components/views/NotFound";
import SettingsView from "@renderer/components/views/SettingsView";
import { useLibraryContext } from "@renderer/contexts/LibraryContext";
import { useAccentColor } from "@renderer/hooks/useAccentColor";
import { useShortcut } from "@renderer/hooks/useShortcut";
import { ROUTES } from "@shared/constants/routes";
import { useEffect, useState } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

const BACK_ACCELERATOR = "Alt+ArrowLeft";
const FORWARD_ACCELERATOR = "Alt+ArrowRight";
const SETTINGS_ACCELERATOR = "CmdOrCtrl+,";

function HomeRoute() {
    const { sources } = useLibraryContext();
    const [hasLoaded, setHasLoaded] = useState(false);

    useEffect(() => {
        if (!hasLoaded) queueMicrotask(() => setHasLoaded(true));
    }, [sources, hasLoaded]);

    if (!hasLoaded) return null;
    if (sources.length === 0) return <MissingSourcesView />;
    return <HomeView />;
}

export default function App() {
    const accentColor = useAccentColor();
    const navigate = useNavigate();

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        let timeoutId: number | null = null;

        const handleThemeChange = () => {
            const root = document.documentElement;
            root.classList.add("theme-transition");
            if (timeoutId !== null) clearTimeout(timeoutId);
            timeoutId = window.setTimeout(() => {
                root.classList.remove("theme-transition");
                timeoutId = null;
            }, 100);
        };

        mediaQuery.addEventListener("change", handleThemeChange);

        return () => {
            mediaQuery.removeEventListener("change", handleThemeChange);
            if (timeoutId !== null) clearTimeout(timeoutId);
        };
    }, []);

    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty("--color-accent", accentColor);

        return () => {
            root.style.removeProperty("--color-accent");
        };
    }, [accentColor]);

    useShortcut(BACK_ACCELERATOR, () => navigate(-1), { windowId: "main" });
    useShortcut(FORWARD_ACCELERATOR, () => navigate(1), { windowId: "main" });
    useShortcut(
        SETTINGS_ACCELERATOR,
        () => electron.invoke("window:new", "/settings", "settings"),
        { windowId: "main" },
    );

    return (
        <div className="flex h-dvh w-full flex-col">
            <TitleBar />
            <Routes>
                <Route path={ROUTES.HOME} element={<HomeRoute />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsView />} />
                <Route path={ROUTES.ADD_SOURCE} element={<AddSourceView />} />
                <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
        </div>
    );
}
