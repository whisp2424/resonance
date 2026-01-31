import { DatabaseDebugView } from "@renderer/components/settings/DatabaseDebugView";
import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";

export function DeveloperSettings() {
    return (
        <SettingsCategory title="Developer Settings">
            <DatabaseDebugView />
        </SettingsCategory>
    );
}
