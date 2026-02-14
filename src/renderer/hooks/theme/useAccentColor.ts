import { useThemeStore } from "@renderer/lib/state/themeStore";

export function useAccentColor(): string {
    return useThemeStore((state) => state.accentColor);
}
