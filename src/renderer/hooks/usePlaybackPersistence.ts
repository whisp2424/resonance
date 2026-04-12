import type { PlaybackState } from "@shared/schema/playback";
import type { Result } from "@shared/types/result";

import { usePlaybackStore } from "@renderer/lib/audio/state/playbackStore";
import { useQueueStore } from "@renderer/lib/audio/state/queueStore";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";
import { useEffect } from "react";

let positionPersistInterval: number | null = null;
let volumeDebounceTimer: number | null = null;

type PreviousState = {
    isPlaying: boolean;
    volume: number;
    queueLength: number;
    currentEntryId: number | null;
};

const previousState: PreviousState = {
    isPlaying: false,
    volume: 1,
    queueLength: 0,
    currentEntryId: null,
};

function initPositionPersistenceLoop(): void {
    if (positionPersistInterval) return;
    positionPersistInterval = setInterval(() => {
        if (usePlaybackStore.getState().isPlaying) persistState();
    }, 2000);
}

function stopPositionPersistenceLoop(): void {
    if (positionPersistInterval) {
        clearInterval(positionPersistInterval);
        positionPersistInterval = null;
    }
}

async function persistState(): Promise<void> {
    const playbackState = usePlaybackStore.getState();
    const queueState = useQueueStore.getState();

    const currentEntryIndex =
        queueState.currentEntryId !== null
            ? queueState.entries.findIndex(
                  (e) => e.id === queueState.currentEntryId,
              )
            : -1;

    const persistedState: PlaybackState = {
        isPlaying: playbackState.isPlaying,
        positionMs: playbackState.positionMs,
        volume: playbackState.volume,
        queueTrackIds: queueState.entries.map((e) => e.trackId),
        currentEntryIndex,
    };

    try {
        await electron.invoke("playback:set", persistedState);
    } catch (err) {
        log(getErrorMessage(err), "playbackPersistence", "error");
    }
}

export async function restorePlaybackState(): Promise<Result<PlaybackState>> {
    try {
        const persisted = await electron.invoke("playback:get");

        if (persisted.queueTrackIds.length === 0) {
            persisted.currentEntryIndex = -1;
            persisted.positionMs = 0;
        }

        usePlaybackStore.setState({
            isPlaying: false, // persisted state unused for now
            positionMs: persisted.positionMs,
        });

        usePlaybackStore.getState().setVolume(persisted.volume);
        initPositionPersistenceLoop();
        return ok(persisted);
    } catch (err) {
        return error(getErrorMessage(err), "unknown");
    }
}

export function usePlaybackPersistence() {
    useEffect(() => {
        const unsubscribePlayback = usePlaybackStore.subscribe((state) => {
            const isPlayingChanged =
                state.isPlaying !== previousState.isPlaying;
            const volumeChanged = state.volume !== previousState.volume;

            if (isPlayingChanged) {
                previousState.isPlaying = state.isPlaying;
                persistState();

                if (state.isPlaying) {
                    initPositionPersistenceLoop();
                } else {
                    stopPositionPersistenceLoop();
                }
            }

            if (volumeChanged) {
                previousState.volume = state.volume;
                if (volumeDebounceTimer) clearTimeout(volumeDebounceTimer);
                volumeDebounceTimer = setTimeout(() => {
                    persistState();
                }, 500);
            }
        });

        const unsubscribeQueue = useQueueStore.subscribe((state) => {
            const queueLengthChanged =
                state.entries.length !== previousState.queueLength;

            const currentEntryChanged =
                state.currentEntryId !== previousState.currentEntryId;

            if (queueLengthChanged || currentEntryChanged) {
                previousState.queueLength = state.entries.length;
                previousState.currentEntryId = state.currentEntryId;
                persistState();
            }
        });

        return () => {
            unsubscribePlayback();
            unsubscribeQueue();
            stopPositionPersistenceLoop();
            if (volumeDebounceTimer) clearTimeout(volumeDebounceTimer);
        };
    }, []);
}
