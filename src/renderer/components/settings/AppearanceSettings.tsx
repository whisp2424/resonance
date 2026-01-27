import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import { useSetting } from "@renderer/hooks/useSetting";

import { SettingsCategory } from "./SettingsCategory";

export function AppearanceSettings() {
    const themeSelectItems = [
        { label: "System", value: "system" },
        { label: "Light", value: "light" },
        { label: "Dark", value: "dark" },
    ] as const;

    const [appTheme, setAppTheme] = useSetting("appearance.appTheme");

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
                        defaultValue={appTheme}
                        onValueChange={(newValue) => {
                            if (newValue) setAppTheme(newValue);
                        }}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                            {themeSelectItems.map((item) => (
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
