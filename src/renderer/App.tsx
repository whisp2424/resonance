import TitleBar from "@renderer/components/layout/TitleBar";
import AddSourceView from "@renderer/components/views/AddSourceView";
import MainView from "@renderer/components/views/MainView";
import NotFound from "@renderer/components/views/NotFound";
import SettingsView from "@renderer/components/views/SettingsView";
import { useAccentColor } from "@renderer/hooks/useAccentColor";
import { ROUTES } from "@shared/constants/routes";
import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";

export default function App() {
    const accentColor = useAccentColor();

    useEffect(() => {
        const setOperatingSystem = async () => {
            const [isWindows, isMac, isLinux] = await Promise.all([
                electron.invoke("system:isWindows"),
                electron.invoke("system:isMac"),
                electron.invoke("system:isLinux"),
            ]);

            if (isWindows) {
                document.documentElement.dataset.os = "windows";
            } else if (isMac) {
                document.documentElement.dataset.os = "mac";
            } else if (isLinux) {
                document.documentElement.dataset.os = "linux";
            }
        };

        setOperatingSystem();
    }, []);

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

    return (
        <div className="flex h-dvh w-full flex-col">
            <TitleBar />
            <Routes>
                <Route path={ROUTES.HOME} element={<MainView />} />
                <Route path={ROUTES.SETTINGS} element={<SettingsView />} />
                <Route path={ROUTES.ADD_SOURCE} element={<AddSourceView />} />
                <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
            </Routes>
        </div>
    );
}
