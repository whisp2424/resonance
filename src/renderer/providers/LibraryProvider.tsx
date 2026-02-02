import type { MediaBackend } from "@shared/constants/mediaBackends";
import type {
    AddSourceResult,
    LibraryMediaSource,
} from "@shared/types/library";

import { LibraryContext } from "@renderer/contexts/LibraryContext";
import { useCallback, useEffect, useMemo, useState } from "react";

export function LibraryProvider({ children }: { children: React.ReactNode }) {
    const [sources, setSources] = useState<LibraryMediaSource[]>([]);

    const loadSources = useCallback(async () => {
        const loadedSources = await electron.invoke("library:getSources");
        setSources(loadedSources);
    }, []);

    useEffect(() => {
        void (async () => {
            const loadedSources = await electron.invoke("library:getSources");
            setSources(loadedSources);
        })();

        const unsubscribe = electron.send(
            "library:onSourcesChanged",
            loadSources,
        );

        return () => unsubscribe();
    }, [loadSources]);

    const addSource = useCallback(
        async (
            uri: string,
            type: MediaBackend,
            name?: string,
        ): Promise<AddSourceResult> => {
            const result = await electron.invoke(
                "library:addSource",
                uri,
                type,
                name,
            );
            if (result.success) {
                await loadSources();
            }
            return result;
        },
        [loadSources],
    );

    const removeSource = useCallback(
        async (uri: string, type?: MediaBackend) => {
            await electron.invoke("library:removeSource", uri, type);
            await loadSources();
        },
        [loadSources],
    );

    const refreshSources = useCallback(async () => {
        await loadSources();
    }, [loadSources]);

    const value = useMemo(
        () => ({
            sources,
            addSource,
            removeSource,
            refreshSources,
        }),
        [sources, addSource, removeSource, refreshSources],
    );

    return (
        <LibraryContext.Provider value={value}>
            {children}
        </LibraryContext.Provider>
    );
}
