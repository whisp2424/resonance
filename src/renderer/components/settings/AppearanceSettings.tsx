import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import { useSetting } from "@renderer/hooks/settings/useSetting";

export function AppearanceSettings() {
    const themeSelectItems = [
        { label: "System", value: "system" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
    ] as const;

    const trayIconSelectItems = [
        { label: "Auto", value: "auto" },
        { label: "White", value: "white" },
        { label: "Dark", value: "dark" },
    ] as const;

    const [appTheme, setAppTheme] = useSetting("appearance.appTheme");
    const [trayIcon, setTrayIcon] = useSetting("appearance.trayIcon");

    return (
        <SettingsCategory title="Appearance">
            <div className="flex flex-row items-center justify-between gap-8">
                <div>
                    <h2>App theme</h2>
                    <p className="text-sm opacity-50">
                        Toggle between light and dark theme
                    </p>
                </div>
                {appTheme !== undefined && (
                    <Select
                        items={themeSelectItems}
                        value={appTheme}
                        onValueChange={(newValue) => {
                            if (newValue) setAppTheme(newValue);
                        }}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {themeSelectItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>

            <div className="flex flex-row items-center justify-between gap-8">
                <div>
                    <h2>Tray icon</h2>
                    <p className="text-sm opacity-50">Pick a tray icon color</p>
                </div>
                {trayIcon !== undefined && (
                    <Select
                        items={trayIconSelectItems}
                        value={trayIcon}
                        onValueChange={(newValue) => {
                            if (newValue) setTrayIcon(newValue);
                        }}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {trayIconSelectItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </div>
        </SettingsCategory>
    );
}
