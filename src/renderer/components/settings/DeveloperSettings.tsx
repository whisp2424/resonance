import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { DatabaseDebug } from "@renderer/components/settings/developer/DatabaseDebug";
import DialogTesting from "@renderer/components/settings/developer/DialogTesting";

export function DeveloperSettings() {
    return (
        <SettingsCategory title="Developer Settings">
            <div className="flex flex-col">
                <section className="flex flex-col gap-4">
                    <h3 className="text-2xl font-light opacity-50">
                        Dialog Testing
                    </h3>
                    <DialogTesting />
                </section>

                <div className="my-4 h-px bg-black opacity-10 dark:bg-white" />

                <section className="flex flex-col gap-4">
                    <h3 className="text-2xl font-light opacity-50">
                        Database debug
                    </h3>
                    <DatabaseDebug />
                </section>
            </div>
        </SettingsCategory>
    );
}
