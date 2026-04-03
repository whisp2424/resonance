import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { SettingsSelectField } from "@renderer/components/settings/SettingsSelectField";
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
        </SettingsCategory>
    );
}
