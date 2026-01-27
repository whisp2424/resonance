import TitleBar from "@renderer/components/layout/TitleBar";
import NotFound from "@renderer/components/views/NotFound";
import SettingsView from "@renderer/components/views/SettingsView";
import SetupView from "@renderer/components/views/SetupView";
import { useAccentColor } from "@renderer/hooks/useAccentColor";
import { ROUTES } from "@shared/constants/routes";
import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

export default function App() {
    const accentColor = useAccentColor();
    const navigate = useNavigate();

    useEffect(() => {
        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

        const handleThemeChange = () => {
            document.documentElement.classList.add("theme-transition");
            document.documentElement.classList.remove("theme-transition");
        };

        mediaQuery.addEventListener("change", handleThemeChange);

        return () =>
            mediaQuery.removeEventListener("change", handleThemeChange);
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
                <Route path={ROUTES.HOME} element={<SetupView />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsView />} />
                <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
        </div>
    );
}
