import type { IconElement } from "@renderer/types/iconElement";
import type { SourceType } from "@shared/constants/sources";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import { useCallback, useEffect, useRef, useState } from "react";

import IconFileQuestion from "~icons/lucide/file-question-mark";
import IconFolder from "~icons/lucide/folder";
import IconTrash from "~icons/lucide/trash-2";

type Source = {
    id: number;
    type: string;
    uri: string;
    displayName: string;
};

interface SourceItemProps {
    source: Source;
    onRemove: (uri: string, type: SourceType) => void;
}

interface SourceListProps {
    sources: Source[];
    onRemove: (uri: string, type: SourceType) => void;
}

const SOURCE_ICONS: Record<string, IconElement> = {
    local: IconFolder,
};

function useLibrarySources() {
    const [sources, setSources] = useState<Source[]>([]);
    const hasLoaded = useRef(false);

    const loadSources = useCallback(async () => {
        const loadedSources = await electron.invoke("library:getSources");
        setSources(loadedSources);
    }, []);

    useEffect(() => {
        if (!hasLoaded.current) {
            (async () => {
                await loadSources();
                hasLoaded.current = true;
            })();
        }

        const unsubscribe = electron.send(
            "library:onSourcesChanged",
            loadSources,
        );

        return () => unsubscribe();
    }, [loadSources]);

    const removeSource = useCallback(
        async (uri: string, type: SourceType) => {
            await electron.invoke("library:removeSource", uri, type);
            await loadSources();
        },
        [loadSources],
    );

    return { sources, removeSource };
}

function SourceItem({ source, onRemove }: SourceItemProps) {
    const Icon = SOURCE_ICONS[source.type] ?? IconFileQuestion;
    return (
        <li className="flex items-center gap-4">
            <Icon className="size-6 opacity-50" />
            <div className="flex flex-1 flex-col">
                <div className="flex items-center gap-2">
                    <span>{source.displayName}</span>
                    <span className="text-sm opacity-50">{source.type}</span>
                </div>
                <span className="text-sm opacity-50">{source.uri}</span>
            </div>
            <Button
                icon={IconTrash}
                onClick={() => onRemove(source.uri, source.type as SourceType)}
                className="p-2">
                Remove
            </Button>
        </li>
    );
}

function SourcesList({ sources, onRemove }: SourceListProps) {
    if (sources.length === 0) {
        return (
            <p className="pt-8 pb-4 text-center text-neutral-500 dark:text-neutral-400">
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
    const { sources, removeSource } = useLibrarySources();
    return (
        <SettingsCategory title="Library">
            <div className="flex flex-col gap-4 rounded-md border border-neutral-300 bg-black/4 p-4 dark:border-neutral-800 dark:bg-white/2">
                <SourcesList sources={sources} onRemove={removeSource} />
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
