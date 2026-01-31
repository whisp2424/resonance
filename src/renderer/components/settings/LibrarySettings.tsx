import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";

export function LibrarySettings() {
    return (
        <SettingsCategory title="Library">
            <div className="flex flex-col gap-4 rounded-md border border-neutral-300 bg-black/4 p-4 dark:border-neutral-800 dark:bg-white/2">
                <p className="pt-8 pb-4 text-center text-neutral-500 lowercase dark:text-neutral-400">
                    No media sources have been setup yet...
                </p>
                <div className="flex flex-row items-center justify-end">
                    <Button
                        onClick={() => {
                            electron.invoke(
                                "window:new",
                                "/add-source",
                                "addSource",
                            );
                        }}>
                        Add...
                    </Button>
                </div>
            </div>
        </SettingsCategory>
    );
}
