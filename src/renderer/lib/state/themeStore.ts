import { create } from "zustand";

interface ThemeState {
    accentColor: string;
    isDarkTheme: boolean;
}

interface ThemeActions {
    initialize: () => Promise<void>;
}

export type ThemeStore = ThemeState & ThemeActions;

function stripAlpha(hexColor: string) {
    if (hexColor.length === 8)
        return hexColor.substring(0, hexColor.length - 2);
    return hexColor;
}

function applyAccentColor(color: string) {
    const root = document.documentElement;
    root.style.setProperty("--color-accent", color);
}

export const useThemeStore = create<ThemeState & ThemeActions>((set) => ({
    accentColor: "#0078d4",
    isDarkTheme: window.matchMedia("(prefers-color-scheme: dark)").matches,

    initialize: async () => {
        const color = await electron.invoke("system:getAccentColor");
        const accentColor = `#${stripAlpha(color)}`;
        set({ accentColor });
        applyAccentColor(accentColor);
    },
}));

export function initializeThemeListeners() {
    const unsubscribeAccent = electron.send(
        "system:onAccentColorChanged",
        (color) => {
            const accentColor = `#${stripAlpha(color)}`;
            useThemeStore.setState({ accentColor });
            applyAccentColor(accentColor);
        },
    );

    const query = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = (event: MediaQueryListEvent) => {
        document.documentElement.classList.add("theme-transition");
        useThemeStore.setState({ isDarkTheme: event.matches });
        setTimeout(() => {
            document.documentElement.classList.remove("theme-transition");
        }, 100);
    };

    query.addEventListener("change", handleChange);

    return () => {
        unsubscribeAccent();
        query.removeEventListener("change", handleChange);
    };
}
