import { useThemeStore } from "@renderer/state/themeStore";

export function useDarkTheme(): boolean {
    return useThemeStore((state) => state.isDarkTheme);
}
