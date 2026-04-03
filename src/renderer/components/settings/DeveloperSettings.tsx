import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { SettingsSection } from "@renderer/components/settings/SettingsSection";
import AudioTesting from "@renderer/components/settings/developer/AudioTesting";
import DialogTesting from "@renderer/components/settings/developer/DialogTesting";

export function DeveloperSettings() {
    return (
        <SettingsCategory title="Developer Settings">
            <div className="flex flex-col gap-2">
                <SettingsSection title="Audio Testing" className="gap-4">
                    <AudioTesting />
                </SettingsSection>

                <SettingsSection title="Dialog Testing" className="gap-4">
                    <DialogTesting />
                </SettingsSection>
            </div>
        </SettingsCategory>
    );
}
