import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { SettingsRow } from "@renderer/components/settings/SettingsRow";
import { SettingsSelectField } from "@renderer/components/settings/SettingsSelectField";
import { Switch } from "@renderer/components/ui/Switch";
import { useSetting } from "@renderer/hooks/settings/useSetting";

export function AppearanceSettings() {
    const themeSelectItems = [
        { label: "System", value: "system" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
    ] as const;

    const trayIconSelectItems = [
        { label: "Auto", value: "auto" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
    ] as const;

    const [appTheme, setAppTheme] = useSetting("appearance.appTheme");
    const [autoHideTitleBar, setAutoHideTitleBar] = useSetting(
        "appearance.autoHideTitleBar",
    );
    const [trayIcon, setTrayIcon] = useSetting("appearance.trayIcon");

    return (
        <SettingsCategory title="Appearance">
            <SettingsSelectField
                title="App theme"
                description="Toggle between light and dark theme"
                items={themeSelectItems}
                value={appTheme}
                onValueChange={(newValue) => {
                    setAppTheme(newValue);
                }}
            />

            <SettingsSelectField
                title="Tray icon"
                description="Pick a tray icon color"
                items={trayIconSelectItems}
                value={trayIcon}
                onValueChange={(newValue) => {
                    setTrayIcon(newValue);
                }}
            />

            <SettingsRow
                title="Auto-hide title bar"
                description="Automatically hide the title bar when fullscreen, activate when hovering near the top edge of the screen">
                <Switch
                    checked={autoHideTitleBar ?? true}
                    onCheckedChange={(checked) => {
                        setAutoHideTitleBar(checked);
                    }}
                />
            </SettingsRow>
        </SettingsCategory>
    );
}
