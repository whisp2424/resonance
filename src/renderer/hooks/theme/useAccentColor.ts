import { useThemeStore } from "@renderer/lib/settings/themeStore";

export function useAccentColor(): string {
    return useThemeStore((state) => state.accentColor);
}
