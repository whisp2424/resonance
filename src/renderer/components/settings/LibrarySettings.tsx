import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";

import IconFolder from "~icons/lucide/folder";

export function LibrarySettings() {
    return (
        <SettingsCategory title="Library">
            <div className="flex flex-col gap-4 rounded-md border border-neutral-300 bg-black/4 p-4 dark:border-neutral-800 dark:bg-white/2">
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center opacity-50">
                    <IconFolder className="size-16" />
                    <span>No media sources have been setup yet!</span>
                </div>
                <div className="flex flex-row items-center justify-end">
                    <Button
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
