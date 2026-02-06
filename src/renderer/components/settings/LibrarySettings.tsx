import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";

export function LibrarySettings() {
    return (
        <SettingsCategory title="Library">
            <div className="flex flex-col gap-6 rounded-lg border border-neutral-300 bg-black/4 p-6 dark:border-neutral-800 dark:bg-white/2">
                <p className="pt-8 pb-4 text-center opacity-50">
                    No media sources have been added yet!
                </p>
                <div className="flex flex-row items-end justify-end">
                    <Button
                        variant="primary"
                        onClick={() => {
                            electron.invoke(
                                "window:new",
                                "/add-source",
                                "addSource",
                            );
                        }}>
                        Add source
                    </Button>
                </div>
            </div>
        </SettingsCategory>
    );
}
