import type { LibraryMediaSource } from "@shared/types/library";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import {
    useRemoveSource,
    useSources,
} from "@renderer/hooks/library/useSources";
import { useDialog } from "@renderer/hooks/useDialog";
import { useIpcListener } from "@renderer/hooks/useIpcListener";
import { useCallback, useEffect, useState } from "react";
import TimeAgo from "timeago-react";

import IconFolder from "~icons/lucide/folder";

interface SourceItemProps {
    source: LibraryMediaSource;
    onRemove: () => void;
    isScanning: boolean;
    progress: { processed: number; total: number } | null;
    scanStatusLoaded: boolean;
}

function SourceItem({
    source,
    onRemove,
    isScanning,
    progress,
    scanStatusLoaded,
}: SourceItemProps) {
    const isButtonDisabled = !scanStatusLoaded || isScanning;

    return (
        <div className="flex items-center justify-between pl-1">
            <div className="flex flex-row items-center gap-4">
                <IconFolder className="opacity-20" />
                <div className="flex flex-col">
                    <h2>{source.displayName}</h2>
                    <span className="text-xs opacity-50">{source.path}</span>
                    {isScanning && progress ? (
                        <span className="text-xs opacity-50">
                            {progress.processed === 0 && progress.total === 0
                                ? "scanning in progress..."
                                : `scanning, ${progress.processed} out of ${progress.total} files processed...`}
                        </span>
                    ) : (
                        <span className="text-xs opacity-50">
                            {source.fileCount} files, scanned {}
                            <TimeAgo datetime={source.lastUpdated} live />
                        </span>
                    )}
                </div>
            </div>
            <div className="flex flex-col items-center justify-start gap-1.5">
                <Button onClick={onRemove} disabled={isButtonDisabled}>
                    Remove
                </Button>
                <button
                    className="text-xs lowercase opacity-50 hover:underline disabled:pointer-events-none"
                    onClick={() => {
                        electron.invoke("library:scanSource", source.id);
                    }}
                    disabled={isButtonDisabled}>
                    {isScanning ? "Scanning..." : "Scan Now"}
                </button>
            </div>
        </div>
    );
}

export function LibrarySettings() {
    const { data: sources, isLoading, error, refetch } = useSources();
    const removeSource = useRemoveSource();
    const { openDialog } = useDialog();

    const [activeScans, setActiveScans] = useState<
        Map<number, { processed: number; total: number }>
    >(new Map());
    const [scanStatusLoaded, setScanStatusLoaded] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function fetchProgress() {
            if (!mounted) return;
            const progress = await electron.invoke("library:getScanProgress");
            if (mounted) {
                setActiveScans(progress);
                setScanStatusLoaded(true);
            }
        }

        fetchProgress();
        const interval = setInterval(fetchProgress, 500);

        return () => {
            mounted = false;
            clearInterval(interval);
        };
    }, []);

    useIpcListener(
        "library:onScanStart",
        useCallback((sourceId: number) => {
            setActiveScans((prev) => {
                const next = new Map(prev);
                next.set(sourceId, { processed: 0, total: 0 });
                return next;
            });
        }, []),
    );

    useIpcListener(
        "library:onScanEnd",
        useCallback(
            (sourceId: number) => {
                setActiveScans((prev) => {
                    const next = new Map(prev);
                    next.delete(sourceId);
                    return next;
                });
                refetch();
            },
            [refetch],
        ),
    );

    useIpcListener(
        "library:onSourcesChanged",
        useCallback(() => {
            refetch();
        }, [refetch]),
    );

    const handleRemove = async (source: LibraryMediaSource) => {
        const confirm = await openDialog({
            type: "question",
            title: `Remove ${source.displayName}?`,
            description: `Your albums and tracks from this media source will be removed, this won't delete your files.`,
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
                        {sources.map((source) => {
                            const scanProgress = activeScans.get(source.id);
                            return (
                                <SourceItem
                                    key={source.id}
                                    source={source}
                                    onRemove={() => handleRemove(source)}
                                    isScanning={!!scanProgress}
                                    progress={scanProgress ?? null}
                                    scanStatusLoaded={scanStatusLoaded}
                                />
                            );
                        })}
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
