/**
 * A track boundary entry mapping a track to its start position in the
 * cumulative sample stream.
 */
export interface TrackBoundary {
    /** The ID of the track this boundary belongs to. */
    trackId: number;

    /** The cumulative sample offset at which this track begins. */
    cumulativeOffset: number;
}

export interface TrackTimelineCallbacks {
    /**
     * Called when the resolved track changes — i.e. playback crosses a boundary
     * into a new track.
     */
    onTrackChanged: (trackId: number) => void;

    /**
     * Called once when `consumedSamples` reaches or exceeds the final track's
     * end offset.
     */
    onPlaybackEnded: () => void;
}

/**
 * The result of resolving a cumulative sample count to a specific track and
 * position within it.
 */
export interface ResolvedPosition {
    /** The track currently playing. */
    trackId: number;

    /** The number of samples consumed within the current track. */
    sampleOffset: number;
}

/**
 * Maps cumulative sample offsets to track IDs, allowing a polling consumer
 * to resolve which track is currently playing and its position within that
 * track.
 *
 * Boundaries are added at write time (when `onWriteEnd` fires) and resolved
 * at display time (on each animation frame) against the engine's consumed
 * sample count.
 *
 * TrackTimeline is completely passive — it does not own any audio resources
 * or drive playback. It only answers "given N consumed samples, what track
 * and offset are we at?"
 */
export class TrackTimeline {
    private readonly callbacks: TrackTimelineCallbacks;

    /** Sorted list of track boundaries, one per track in the current queue. */
    private boundaries: TrackBoundary[] = [];

    /** Index into `boundaries` for the track currently being resolved. */
    private currentIndex = 0;

    /**
     * Cumulative sample offset at which playback ends, set when the last track
     * finishes writing.
     */
    private finalEndOffset: number | null = null;

    /**
     * Whether `onPlaybackEnded` has already been fired. Prevents duplicate
     * calls.
     */
    private ended = false;

    constructor(callbacks: TrackTimelineCallbacks) {
        this.callbacks = callbacks;
    }

    /**
     * Resets the timeline to a single track. Used when playback starts or seeks
     * to a new position.
     */
    reset(trackId: number): void {
        this.boundaries = [{ trackId, cumulativeOffset: 0 }];
        this.currentIndex = 0;
        this.finalEndOffset = null;
        this.ended = false;
    }

    /**
     * Registers the next track's boundary. Called from `onWriteEnd` when a
     * track finishes writing to the ring buffer.
     *
     * @param trackId - The ID of the track that is starting.
     * @param previousTrackSamples - Samples written for the track that just
     * completed. Added to the previous boundary's offset to compute the
     * cumulative position where the new track begins.
     */
    addBoundary(trackId: number, previousTrackSamples: number): void {
        const lastBoundary = this.boundaries[this.boundaries.length - 1];
        const cumulativeOffset =
            lastBoundary.cumulativeOffset + previousTrackSamples;

        this.boundaries.push({ trackId, cumulativeOffset });
    }

    /**
     * Marks the absolute end of playback. Called from `onWriteEnd` when the
     * last track in the queue finishes writing.
     *
     * @param lastTrackSamples - Samples written for the final track.
     */
    markFinalBoundary(lastTrackSamples: number): void {
        const lastBoundary = this.boundaries[this.boundaries.length - 1];
        this.finalEndOffset = lastBoundary.cumulativeOffset + lastTrackSamples;
    }

    /**
     * Given the engine's consumed sample count, returns the current track and
     * position within it.
     *
     * Fires `onTrackChanged` when the resolved track differs from the
     * previous call, and `onPlaybackEnded` (once) when consumed samples
     * pass the final boundary.
     *
     * Returns `null` if the timeline is empty or playback has ended.
     */
    resolve(consumedSamples: number): ResolvedPosition | null {
        if (this.boundaries.length === 0) return null;

        if (
            this.finalEndOffset !== null &&
            consumedSamples >= this.finalEndOffset
        ) {
            if (!this.ended) {
                this.ended = true;
                this.callbacks.onPlaybackEnded();
            }
            return null;
        }

        // find the last boundary whose offset <= consumedSamples
        let boundaryIndex = 0;
        for (let i = this.boundaries.length - 1; i >= 0; i--) {
            if (consumedSamples >= this.boundaries[i].cumulativeOffset) {
                boundaryIndex = i;
                break;
            }
        }

        if (boundaryIndex !== this.currentIndex) {
            this.currentIndex = boundaryIndex;
            this.callbacks.onTrackChanged(
                this.boundaries[boundaryIndex].trackId,
            );
        }

        const currentBoundary = this.boundaries[boundaryIndex];

        return {
            trackId: currentBoundary.trackId,
            sampleOffset: consumedSamples - currentBoundary.cumulativeOffset,
        };
    }
}
