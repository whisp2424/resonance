import type { CSSProperties } from "react";

import TitleBar from "@renderer/components/layout/TitleBar";
import HomeView from "@renderer/components/views/HomeView";
import NotFound from "@renderer/components/views/NotFound";
import SettingsView from "@renderer/components/views/SettingsView";
import { useAccentColor } from "@renderer/hooks/useAccentColor";
import { ROUTES } from "@shared/constants/routes";
import { useEffect } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";

export default function App() {
    const accentColor = useAccentColor();
    const navigate = useNavigate();

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

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, [navigate]);

    return (
        <div
            className="flex h-dvh w-full flex-col"
            style={{ "--accent-color": accentColor } as CSSProperties}>
            <TitleBar />
            <Routes>
                <Route path={ROUTES.HOME} element={<HomeView />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsView />} />
                <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
        </div>
    );
}
