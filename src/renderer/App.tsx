import TitleBar from "@renderer/components/layout/TitleBar";
import MissingSourcesView from "@renderer/components/views/MissingSourcesView";
import NotFound from "@renderer/components/views/NotFound";
import SettingsView from "@renderer/components/views/SettingsView";
import { useAccentColor } from "@renderer/hooks/useAccentColor";
import { ROUTES } from "@shared/constants/routes";
import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

import AddSourceView from "./components/views/AddSourceView";
import DialogView from "./components/views/DialogView";

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

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.altKey && event.key === "ArrowLeft") {
                event.preventDefault();
                navigate(-1);
            } else if (event.altKey && event.key === "ArrowRight") {
                event.preventDefault();
                navigate(1);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [navigate]);

    return (
        <div className="flex h-dvh w-full flex-col">
            <TitleBar />
            <Routes>
                <Route path={ROUTES.HOME} element={<MissingSourcesView />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsView />} />
                <Route path={ROUTES.ADD_SOURCE} element={<AddSourceView />} />
                <Route path={ROUTES.DIALOG} element={<DialogView />} />
                <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
        </div>
    );
}
