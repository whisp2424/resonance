import type { TrackResult } from "@shared/types/library";

import { usePlaybackStore } from "@renderer/lib/audio/state/playbackStore";
import { log } from "@shared/utils/logger";
import { create } from "zustand";

const REWIND_THRESHOLD_MS = 3000;

let nextEntryId = 1;

export interface QueueEntry {
    id: number;
    trackId: number;
    track: TrackResult;
}

export interface EnqueueOptions {
    /**
     * Enqueue after the current track and immediately start playing from the
     * first newly enqueued track.
     */
    playNow?: boolean;

    /**
     * Insert the tracks after the current track instead of appending to the
     * end of the queue.
     */
    enqueueAfter?: boolean;

    /**
     * Clear the existing queue and replace it with the given tracks.
     *
     * If no tracks are provided, the queue is simply cleared.
     */
    clearQueue?: boolean;
}

interface QueueState {
    entries: QueueEntry[];
    currentEntryId: number | null;
}

interface QueueActions {
    /**
     * Adds tracks to the queue. By default, tracks are appended at the end.
     *
     * Passing no tracks will do nothing, unless the `clearQueue` option is
     * true.
     */
    enqueue(trackIds: number[], options?: EnqueueOptions): Promise<void>;

    /** Removes a track from the queue by index. */
    remove(index: number): void;

    /** Moves a track from one index to another within the queue. */
    reorder(from: number, to: number): void;

    /** Starts playback from the given queue index. */
    jump(index: number): Promise<void>;

    /** Skips to the next track in the queue. */
    next(): Promise<void>;

    /**
     * Jumps to the previous track, or rewinds to the beginning of the current
     * track, depending on the circumstances.
     */
    previous(): Promise<void>;
}

export type QueueStore = QueueState & QueueActions;

async function fetchTrackResults(trackIds: number[]): Promise<TrackResult[]> {
    if (trackIds.length === 0) return [];

    const result = await electron.invoke("library:getTracks", trackIds);
    const trackMap = new Map(result.tracks.map((t) => [t.track.id, t]));

    const tracks = trackIds
        .map((id) => trackMap.get(id))
        .filter((t): t is TrackResult => t !== undefined);

    const missing = trackIds.length - tracks.length;

    if (missing > 0) {
        log(
            `${missing} track IDs could not be resolved`,
            "queueStore",
            "warning",
        );
    }

    return tracks;
}

function createEntries(tracks: TrackResult[]): QueueEntry[] {
    return tracks.map((track) => ({
        id: nextEntryId++,
        trackId: track.track.id,
        track,
    }));
}

export const useQueueStore = create<QueueStore>((set, get) => ({
    entries: [],
    currentEntryId: null,

    enqueue: async (trackIds: number[], options?: EnqueueOptions) => {
        const { playNow, enqueueAfter, clearQueue } = options ?? {};
        const tracks = await fetchTrackResults(trackIds);

        if (clearQueue) {
            const newEntries = createEntries(tracks);
            set({ entries: newEntries, currentEntryId: null });

            if (playNow && newEntries.length > 0) {
                await get().jump(0);
            }

            return;
        }

        const newEntries = createEntries(tracks);
        const shouldInsertAfter = playNow || enqueueAfter;
        let firstNewEntryId: number | undefined;

        set((state) => {
            const { entries, currentEntryId } = state;

            const currentIndex =
                currentEntryId !== null
                    ? entries.findIndex((e) => e.id === currentEntryId)
                    : -1;

            const currentEntryExists = currentIndex >= 0;
            let mergedEntries: QueueEntry[];

            if (shouldInsertAfter && currentEntryExists) {
                const insertIndex = currentIndex + 1;
                firstNewEntryId = newEntries[0]?.id;
                mergedEntries = [
                    ...entries.slice(0, insertIndex),
                    ...newEntries,
                    ...entries.slice(insertIndex),
                ];
            } else {
                mergedEntries = [...entries, ...newEntries];
            }

            return { entries: mergedEntries };
        });

        if (playNow && newEntries.length > 0) {
            const state = get();
            const insertPoint =
                shouldInsertAfter && state.currentEntryId !== null
                    ? state.entries.findIndex((e) => e.id === firstNewEntryId)
                    : state.entries.length - newEntries.length;

            if (insertPoint >= 0) {
                await get().jump(insertPoint);
            }
        }
    },

    remove: (index: number) => {
        set((state) => {
            const { entries, currentEntryId } = state;
            if (index < 0 || index >= entries.length) return state;

            const removedEntry = entries[index];
            const newEntries = entries.filter((_, i) => i !== index);

            const newCurrentId =
                currentEntryId === removedEntry.id ? null : currentEntryId;

            return { entries: newEntries, currentEntryId: newCurrentId };
        });
    },

    reorder: (from: number, to: number) => {
        set((state) => {
            const { entries, currentEntryId } = state;
            if (
                from < 0 ||
                from >= entries.length ||
                to < 0 ||
                to >= entries.length ||
                from === to
            ) {
                return state;
            }

            const newEntries = [...entries];
            const [moved] = newEntries.splice(from, 1);
            newEntries.splice(to, 0, moved);

            return { entries: newEntries, currentEntryId };
        });
    },

    jump: async (index: number) => {
        const { entries } = get();
        if (index < 0 || index >= entries.length) return;

        const entry = entries[index];
        const playbackStore = usePlaybackStore.getState();
        await playbackStore.load(entry.trackId);

        set({ currentEntryId: entry.id });
    },

    next: async () => {
        const { entries, currentEntryId } = get();
        if (currentEntryId === null) return;

        const currentIndex = entries.findIndex((e) => e.id === currentEntryId);
        const nextIndex = currentIndex + 1;

        if (nextIndex >= entries.length) return;

        await get().jump(nextIndex);
    },

    previous: async () => {
        const { entries, currentEntryId } = get();
        if (currentEntryId === null) return;

        const positionMs = usePlaybackStore.getState().positionMs;

        if (positionMs > REWIND_THRESHOLD_MS) {
            usePlaybackStore.getState().seek(0);
            return;
        }

        const currentIndex = entries.findIndex((e) => e.id === currentEntryId);
        if (currentIndex <= 0) return;

        await get().jump(currentIndex - 1);
    },
}));

usePlaybackStore.getState().onTrackEnded(() => {
    void useQueueStore.getState().next();
});
