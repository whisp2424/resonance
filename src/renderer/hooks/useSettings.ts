import { useSettingsContext } from "@renderer/contexts/SettingsContext";

export function useSettings() {
    const { settings, updateSettings, setSetting } = useSettingsContext();
    return [settings, updateSettings, setSetting] as const;
}
