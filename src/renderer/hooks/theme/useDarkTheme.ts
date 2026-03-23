import { useThemeStore } from "@renderer/lib/settings/themeStore";

export function useDarkTheme(): boolean {
    return useThemeStore((state) => state.isDarkTheme);
}
