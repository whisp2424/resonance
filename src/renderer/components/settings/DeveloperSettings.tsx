import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import DialogTesting from "@renderer/components/settings/developer/DialogTesting";

export function DeveloperSettings() {
    return (
        <SettingsCategory title="Developer Settings">
            <div className="flex flex-col gap-2">
                <section className="flex flex-col gap-4">
                    <h3 className="text-2xl font-light opacity-50">
                        Dialog Testing
                    </h3>
                    <DialogTesting />
                </section>
            </div>
        </SettingsCategory>
    );
}
