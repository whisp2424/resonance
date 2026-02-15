import type { LibraryMediaSource } from "@shared/types/library";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import {
    useRemoveSource,
    useSources,
} from "@renderer/hooks/library/useSources";
import { useDialog } from "@renderer/hooks/useDialog";
import { useEffect } from "react";

import IconFolder from "~icons/lucide/folder";

interface SourceItemProps {
    source: LibraryMediaSource;
    onRemove: () => void;
}

function SourceItem({ source, onRemove }: SourceItemProps) {
    return (
        <div className="flex items-center justify-between pl-1">
            <div className="flex flex-row items-center gap-4">
                <IconFolder className="opacity-20" />
                <div className="flex flex-col">
                    <h2 className="flex items-center gap-1.5">
                        {source.displayName}
                    </h2>
                    <span className="text-xs opacity-50">{source.path}</span>
                </div>
            </div>
            <Button onClick={onRemove}>Remove</Button>
        </div>
    );
}

export function LibrarySettings() {
    const { data: sources, isLoading, error, refetch } = useSources();
    const removeSource = useRemoveSource();
    const { openDialog } = useDialog();

    const handleRemove = async (source: LibraryMediaSource) => {
        const confirm = await openDialog({
            type: "question",
            title: `Remove ${source.displayName}`,
            description: `Are you sure you want to remove ${source.displayName}? This won't delete your files.`,
            id: "confirm:remove-source",
            buttons: [
                { label: "Cancel", value: "cancel", default: true },
                { label: "Remove", value: "remove", variant: "primary" },
            ],
        });

        if (confirm !== "remove") return;

        const result = await removeSource.mutateAsync({
            id: source.id,
        });

        if (!result.success) {
            switch (result.error) {
                case "not_found":
                    await openDialog({
                        type: "error",
                        title: "Source not found",
                        description:
                            result.message ||
                            "The media source could not be found. It may have already been removed.",
                        id: "error:source-not-found",
                    });
                    break;
                case "unknown":
                default:
                    await openDialog({
                        type: "error",
                        title: "Failed to remove source",
                        description:
                            result.message ||
                            "An error occurred while trying to remove the media source. Please try again.",
                        id: "error:remove-source",
                    });
            }
        }
    };

    useEffect(() => {
        let isMounted = true;
        const unsubscribe = electron.send("library:onSourcesChanged", () => {
            if (isMounted) refetch();
        });
        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [refetch]);

    return (
        <SettingsCategory title="Library">
            <div className="flex flex-col gap-6 rounded-lg border border-neutral-300 bg-black/4 p-6 dark:border-neutral-800 dark:bg-white/2">
                {isLoading ? (
                    <div className="flex items-center justify-center py-8"></div>
                ) : error ? (
                    <p className="py-8 text-center text-sm opacity-50">
                        {error.message}
                    </p>
                ) : !sources || sources.length === 0 ? (
                    <p className="py-8 text-center text-sm opacity-50">
                        No media sources have been added yet!
                    </p>
                ) : (
                    <div className="flex flex-col gap-6">
                        {sources.map((source) => (
                            <SourceItem
                                key={source.id}
                                source={source}
                                onRemove={() => handleRemove(source)}
                            />
                        ))}
                    </div>
                )}
            </div>
            <div className="flex flex-row items-center justify-start">
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
        </SettingsCategory>
    );
}
