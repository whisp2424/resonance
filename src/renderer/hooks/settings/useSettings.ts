import { useSettingsStore } from "@renderer/state/settingsStore";

export function useSettings() {
    const settings = useSettingsStore((state) => state.settings);
    const updateSettings = useSettingsStore((state) => state.updateSettings);
    const updateSetting = useSettingsStore((state) => state.updateSetting);
    return { settings, updateSettings, updateSetting } as const;
}
