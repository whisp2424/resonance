import { useThemeStore } from "@renderer/lib/state/themeStore";

export function useDarkTheme(): boolean {
    return useThemeStore((state) => state.isDarkTheme);
}
