import type { IconElement } from "@renderer/types/iconElement";
import type { MediaBackend } from "@shared/constants/mediaBackends";
import type { LibraryMediaSource } from "@shared/types/library";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import { useLibraryContext } from "@renderer/contexts/LibraryContext";
import { useDialog } from "@renderer/hooks/useDialog";
import { useCallback } from "react";

import IconFileQuestion from "~icons/lucide/file-question-mark";
import IconFolder from "~icons/lucide/folder";
import IconTrash from "~icons/lucide/trash-2";

interface SourceItemProps {
    source: LibraryMediaSource;
    onRemove: (source: LibraryMediaSource) => void;
}

interface SourceListProps {
    sources: LibraryMediaSource[];
    onRemove: (source: LibraryMediaSource) => void;
}

const SOURCE_ICONS: Record<string, IconElement> = {
    local: IconFolder,
};

function SourceItem({ source, onRemove }: SourceItemProps) {
    const Icon = SOURCE_ICONS[source.backend] ?? IconFileQuestion;
    return (
        <li className="flex items-center gap-4">
            <Icon className="size-6 opacity-50" />
            <div className="flex flex-1 flex-col">
                <span>
                    {source.displayName}{" "}
                    <span className="text-xs opacity-50">
                        ({source.backend})
                    </span>
                </span>
                <span className="text-sm opacity-50">{source.uri}</span>
            </div>
            <Button
                icon={IconTrash}
                onClick={() => {
                    onRemove(source);
                }}
                className="p-2">
                Remove
            </Button>
        </li>
    );
}

function SourcesList({ sources, onRemove }: SourceListProps) {
    if (sources.length === 0) {
        return (
            <p className="pt-8 pb-4 text-center opacity-50">
                No media sources have been setup yet...
            </p>
        );
    }

    return (
        <ul className="flex flex-col gap-4">
            {sources.map((source) => (
                <SourceItem
                    key={source.id}
                    source={source}
                    onRemove={onRemove}
                />
            ))}
        </ul>
    );
}

export function LibrarySettings() {
    const { sources, removeSource } = useLibraryContext();
    const { openDialog } = useDialog();

    const handleRemove = useCallback(
        async (source: LibraryMediaSource) => {
            const result = await openDialog({
                type: "question",
                title: `Remove ${source.displayName}`,
                description: `Are you sure you want to remove ${source.displayName}? This won't delete your files.`,
                buttons: [
                    { label: "Cancel", value: "cancel", variant: "secondary" },
                    { label: "Remove", value: "remove", variant: "primary" },
                ],
                id: "confirm:remove-source",
            });

            if (result === "remove") {
                await removeSource(source.uri, source.backend as MediaBackend);
            }
        },
        [removeSource, openDialog],
    );

    return (
        <SettingsCategory title="Library">
            <div className="flex flex-col gap-6 rounded-lg border border-neutral-300 bg-black/4 px-6 py-4 dark:border-neutral-800 dark:bg-white/2">
                <SourcesList sources={sources} onRemove={handleRemove} />
                <div className="flex flex-row items-center justify-end">
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
