import { useEffect } from "react";
import { Route, Routes, useLocation, useNavigate } from "react-router-dom";

import MiniPlayer from "@/components/layout/MiniPlayer";
import TitleBar from "@/components/layout/TitleBar";
import HomeView from "@/components/views/HomeView";
import NotFound from "@/components/views/NotFound";
import { ROUTES, routeConfig } from "@/constants/routes";
import { useAccentColor } from "@/hooks/useAccentColor";

export default function App() {
    const accentColor = useAccentColor();
    const navigate = useNavigate();
    const location = useLocation();

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

    useEffect(() => {
        const currentRoute =
            routeConfig.find((route) => route.path === location.pathname) ||
            routeConfig.find((route) => route.path === "*");
        if (currentRoute.title) electron.window.setTitle(currentRoute.title);
    }, [location.pathname]);

    return (
        <div
            className="flex h-dvh w-full flex-col"
            style={{ "--accent-color": accentColor } as React.CSSProperties}>
            <TitleBar />
            <Routes>
                <Route path={ROUTES.HOME} element={<HomeView />} />
                <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
            <MiniPlayer />
        </div>
    );
}
