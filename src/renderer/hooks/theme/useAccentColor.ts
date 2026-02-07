import { useThemeStore } from "@renderer/state/themeStore";

export function useAccentColor(): string {
    return useThemeStore((state) => state.accentColor);
}
