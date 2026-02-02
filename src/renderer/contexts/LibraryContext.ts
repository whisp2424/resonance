import type { MediaBackend } from "@shared/constants/mediaBackends";
import type {
    AddSourceResult,
    LibraryMediaSource,
} from "@shared/types/library";

import { createContext, useContext } from "react";

export interface LibraryContextValue {
    sources: LibraryMediaSource[];
    addSource: (
        uri: string,
        type: MediaBackend,
        name?: string,
    ) => Promise<AddSourceResult>;
    removeSource: (uri: string, type?: MediaBackend) => Promise<void>;
    refreshSources: () => Promise<void>;
}

export const LibraryContext = createContext<LibraryContextValue | undefined>(
    undefined,
);

export function useLibraryContext() {
    const context = useContext(LibraryContext);
    if (!context) {
        throw new Error(
            "useLibraryContext must be used within a LibraryProvider",
        );
    }
    return context;
}
