import type { RepeatMode } from "@shared/schema/playback";
import type { Result } from "@shared/types/result";

import { RESTART_THRESHOLD_SECONDS } from "@shared/types/playback";
import { error, ok } from "@shared/types/result";
import { log } from "@shared/utils/logger";
import { create } from "zustand";

export interface EnqueueOptions {
    /**
     * Whether tracks will be enqueued after the currently playing track in the
     * queue.
     */
    enqueueAfter: boolean;

    /**
     * Whether tracks will start playing once enqueued.
     *
     * When this option is enabled, `enqueueAfter` is implicitly true.
     */
    playNow: boolean;

    /**
     * Whether the queue will be cleared, and overridden by the given tracks.
     *
     * When this option is enabled, `playNow` is implicitly true, unless no
     * tracks were enqueued.
     */
    clearQueue: boolean;
}

interface EnqueueResult {
    queue: number[];
}

interface RemoveResult {
    queue: number[];
    errors: { index: number; message: string }[];
}

interface NextResult {
    action: "next" | "ended";
}

interface PreviousResult {
    action: "restart" | "previous";
}

interface QueueState {
    /** The current playback queue, represented by an array of track IDs. */
    queue: number[];

    /** The index for the currently active or playing track in the queue. */
    index: number;

    /** The current queue repeat mode. */
    repeat: RepeatMode;
}

interface QueueActions {
    enqueue: (tracks: number[], options: EnqueueOptions) => EnqueueResult;
    remove: (indices: number[]) => RemoveResult;
    setRepeatMode: (mode: RepeatMode) => void;
    jump: (index: number) => Result<void, "out_of_bounds">;
    next: () => NextResult;
    previous: (trackPosition: number) => PreviousResult;
}

export type QueueStore = QueueState & QueueActions;

export const selectCurrentTrackId = (state: QueueStore): number | null =>
    state.index >= 0 ? (state.queue[state.index] ?? null) : null;

export const selectNextTrackId = (state: QueueStore): number | null => {
    if (state.queue.length === 0) return null;
    if (state.repeat === "single") return state.queue[state.index] ?? null;

    const nextIndex = state.index + 1;
    if (nextIndex < state.queue.length) return state.queue[nextIndex] ?? null;
    if (state.repeat === "all") return state.queue[0] ?? null;

    return null;
};

const DEFAULT_STATE: QueueState = {
    queue: [],
    index: -1,
    repeat: "off",
};

export const useQueueStore = create<QueueStore>((set, get) => ({
    ...DEFAULT_STATE,

    enqueue: (tracks, options) => {
        const { queue, index } = get();
        const { playNow, enqueueAfter, clearQueue } = options;

        if (clearQueue) {
            if (tracks.length === 0) {
                set({ queue: [], index: -1 });
                return { queue: [] };
            }

            set({ queue: tracks, index: 0 });
            return { queue: tracks };
        }

        if (playNow || enqueueAfter) {
            const insertAt = index < 0 ? 0 : index + 1;
            const next = [
                ...queue.slice(0, insertAt),
                ...tracks,
                ...queue.slice(insertAt),
            ];

            const nextIndex = playNow ? insertAt : index < 0 ? 0 : index;
            set({ queue: next, index: nextIndex });
            return { queue: next };
        }

        // Append to end, keep current index
        const next = [...queue, ...tracks];
        const nextIndex = index < 0 && next.length > 0 ? 0 : index;
        set({ queue: next, index: nextIndex });
        return { queue: next };
    },

    remove: (indices) => {
        const { queue, index } = get();
        const errors: RemoveResult["errors"] = [];
        const toRemove = new Set<number>();

        for (const i of indices) {
            if (i < 0 || i >= queue.length) {
                errors.push({
                    index: i,
                    message: `Index ${i} is out of bounds`,
                });
            } else {
                toRemove.add(i);
            }
        }

        if (toRemove.size === 0) {
            log(`remove called with no valid indices`, "queueStore", "warning");
            return { queue, errors };
        }

        const next = queue.filter((_, i) => !toRemove.has(i));

        // recalculate index after removal
        let nextIndex: number;

        if (next.length === 0) {
            nextIndex = -1;
        } else if (toRemove.has(index)) {
            // current track was removed — land on the next available track
            nextIndex = Math.min(index, next.length - 1);
        } else {
            // current track survived — adjust index for removed entries before
            const removedBefore = [...toRemove].filter((i) => i < index).length;
            nextIndex = index - removedBefore;
        }

        set({ queue: next, index: nextIndex });
        return { queue: next, errors };
    },

    setRepeatMode: (mode) => set({ repeat: mode }),

    jump: (index) => {
        const { queue } = get();

        if (index < 0 || index >= queue.length) {
            return error(`Index ${index} is out of bounds`, "out_of_bounds");
        }

        set({ index });
        return ok(undefined);
    },

    next: () => {
        const { queue, index, repeat } = get();
        if (queue.length === 0) return { action: "ended" };

        if (repeat === "single") {
            // stay on the same track — no index change;
            // wiring layer restarts the stream
            set({ index });
            return { action: "next" };
        }

        const nextIndex = index + 1;

        if (nextIndex < queue.length) {
            set({ index: nextIndex });
            return { action: "next" };
        }

        if (repeat === "all") {
            set({ index: 0 });
            return { action: "next" };
        }

        // repeat === "off" and we're at the end — reset to start, stop playback
        set({ index: 0 });
        return { action: "ended" };
    },

    previous: (trackPosition) => {
        const { queue, index, repeat } = get();
        if (queue.length === 0) return { action: "restart" };

        if (trackPosition > RESTART_THRESHOLD_SECONDS) {
            // restart the current track — no index change
            return { action: "restart" };
        }

        const prevIndex = index - 1;

        if (prevIndex >= 0) {
            set({ index: prevIndex });
            return { action: "previous" };
        }

        if (repeat === "all") {
            set({ index: queue.length - 1 });
            return { action: "previous" };
        }

        // already at the start — restart the first track
        return { action: "restart" };
    },
}));
