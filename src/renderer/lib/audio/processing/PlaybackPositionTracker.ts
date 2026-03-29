interface TransportClock {
    readonly transportFrame: number;
    readonly sampleRate: number;
}

/**
 * A committed mapping between the transport clock and a logical track.
 *
 * `startOffsetFrames` is the frame offset within the track that should be
 * reported when playback reaches `startTransportFrame`.
 */
export interface PlaybackSegment {
    trackId: number;
    startOffsetFrames: number;
    startTransportFrame: number;
}

/**
 * A requested segment that has not been committed to audible playback yet.
 *
 * This is used for seeks and track transitions. The caller can declare what
 * should play next, then commit it only once audio from that segment becomes
 * authoritative.
 */
export interface PlaybackSegmentTarget {
    trackId: number;
    startOffsetFrames: number;
}

/**
 * Derives track-aware playback position from the engine's monotonic transport
 * clock.
 *
 * The audio engine only knows how many output frames have actually been
 * consumed. This tracker adds track semantics on top of that clock by keeping
 * an active segment and, optionally, a pending target segment for future seek
 * or transition commits.
 */
export class PlaybackPositionTracker {
    private readonly clock: TransportClock;

    private activeSegment: PlaybackSegment | null = null;
    private targetSegment: PlaybackSegmentTarget | null = null;

    constructor(clock: TransportClock) {
        this.clock = clock;
    }

    get currentTrackId(): number | null {
        return this.activeSegment?.trackId ?? null;
    }

    get active(): PlaybackSegment | null {
        return this.activeSegment;
    }

    get target(): PlaybackSegmentTarget | null {
        return this.targetSegment;
    }

    /**
     * Commits a track segment immediately at the current transport frame.
     *
     * Use this when starting a new track from a known offset and playback from
     * that segment becomes authoritative right away.
     */
    startTrack(trackId: number, offsetSeconds = 0): PlaybackSegment {
        const segment = this.createSegment(trackId, offsetSeconds);
        this.activeSegment = segment;
        this.targetSegment = null;
        return segment;
    }

    /**
     * Records a future segment without making it active yet.
     *
     * This is the track-aware half of a pending seek or transition. The caller
     * should later call `commitTarget()` when audio from this target actually
     * becomes the source of truth.
     */
    setTarget(trackId: number, offsetSeconds = 0): PlaybackSegmentTarget {
        const target = {
            trackId,
            startOffsetFrames: this.secondsToFrames(offsetSeconds),
        };

        this.targetSegment = target;
        return target;
    }

    /**
     * Promotes the current target segment to the active segment at the current
     * transport frame.
     */
    commitTarget(): PlaybackSegment | null {
        if (!this.targetSegment) return null;

        const segment: PlaybackSegment = {
            trackId: this.targetSegment.trackId,
            startOffsetFrames: this.targetSegment.startOffsetFrames,
            startTransportFrame: this.clock.transportFrame,
        };

        this.activeSegment = segment;
        this.targetSegment = null;
        return segment;
    }

    clearTarget(): void {
        this.targetSegment = null;
    }

    clear(): void {
        this.activeSegment = null;
        this.targetSegment = null;
    }

    /**
     * Current position within the active track, in frames.
     */
    get positionFrames(): number {
        if (!this.activeSegment) return 0;

        return (
            this.activeSegment.startOffsetFrames +
            (this.clock.transportFrame - this.activeSegment.startTransportFrame)
        );
    }

    /**
     * Current position within the active track, in seconds.
     */
    get positionSeconds(): number {
        const sampleRate = this.clock.sampleRate;
        if (sampleRate <= 0) return 0;
        return this.positionFrames / sampleRate;
    }

    /**
     * Current position within the active track, in whole milliseconds.
     */
    get positionMilliseconds(): number {
        const sampleRate = this.clock.sampleRate;
        if (sampleRate <= 0) return 0;
        return Math.floor((this.positionFrames * 1000) / sampleRate);
    }

    private createSegment(
        trackId: number,
        offsetSeconds: number,
    ): PlaybackSegment {
        return {
            trackId,
            startOffsetFrames: this.secondsToFrames(offsetSeconds),
            startTransportFrame: this.clock.transportFrame,
        };
    }

    private secondsToFrames(seconds: number): number {
        return Math.max(0, Math.floor(seconds * this.clock.sampleRate));
    }
}
