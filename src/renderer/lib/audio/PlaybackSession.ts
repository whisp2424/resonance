import type { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import type {
    PlaybackSegment,
    PlaybackSegmentBoundary,
} from "@renderer/lib/audio/processing/PlaybackPositionTracker";

import { AudioServerClient } from "@renderer/lib/audio/AudioServerClient";
import { PlaybackPositionTracker } from "@renderer/lib/audio/processing/PlaybackPositionTracker";
import { AudioStream } from "@renderer/lib/audio/streaming/AudioStream";

export interface PlaybackSessionSnapshot {
    generation: number;
    trackId: number | null;
    transportFrame: number;
    transportPositionFrames: number;
    transportPositionMilliseconds: number;
    trackPositionFrames: number;
    trackPositionMilliseconds: number;
    starvationCount: number;
}

/**
 * Coordinates a single seekable playback session for one active track.
 *
 * This is not a queue manager. It only provides the low-level generation-safe
 * flow for replacing the current stream with a new one after a play or seek
 * request:
 *
 * 1. invalidate older requests with a new generation id
 * 2. abort the current stream and wait for it to stop
 * 3. flush/re-anchor the engine at the requested offset
 * 4. commit the target segment at the seek transport boundary
 * 5. restart streaming from the new offset
 *
 * If the replacement stream fails to open, the session fails closed: buffered
 * audio is cleared and the session returns to an idle state rather than
 * pretending the previous stream is still active.
 */
export class PlaybackSession {
    private readonly engine: AudioEngine;
    private readonly tracker: PlaybackPositionTracker;
    private readonly serverClient: AudioServerClient;
    private readonly stream: AudioStream;

    private requestedGeneration = 0;
    private activeGeneration = 0;
    private activeTrackId: number | null = null;

    constructor(engine: AudioEngine, serverPort: number) {
        const buffer = engine.buffer;
        if (!buffer)
            throw new Error(
                "PlaybackSession requires an initialized AudioEngine",
            );

        this.engine = engine;
        this.tracker = new PlaybackPositionTracker(engine);
        this.serverClient = new AudioServerClient(serverPort);
        this.stream = new AudioStream(buffer, {
            onWriteEnd: () => null,
            onError: () => {},
        });
    }

    get generation(): number {
        return this.activeGeneration;
    }

    get currentTrackId(): number | null {
        return this.activeTrackId;
    }

    get positionTracker(): PlaybackPositionTracker {
        return this.tracker;
    }

    get snapshot(): PlaybackSessionSnapshot {
        return {
            generation: this.activeGeneration,
            trackId: this.activeTrackId,
            transportFrame: this.engine.transportFrame,
            transportPositionFrames: this.engine.transportPositionFrames,
            transportPositionMilliseconds:
                this.engine.transportPositionMilliseconds,
            trackPositionFrames: this.tracker.positionFrames,
            trackPositionMilliseconds: this.tracker.positionMilliseconds,
            starvationCount: this.engine.starvationCount,
        };
    }

    /**
     * Starts a fresh playback generation for the given track.
     */
    async playTrack(
        trackId: number,
        offsetSeconds = 0,
    ): Promise<PlaybackSegment | null> {
        const generation = ++this.requestedGeneration;
        return this.replaceStreamGeneration(generation, trackId, offsetSeconds);
    }

    /**
     * Seeks within the currently active track by replacing the stream
     * generation at the requested offset.
     */
    async seek(offsetSeconds: number): Promise<PlaybackSegment | null> {
        if (this.activeTrackId === null) return null;

        const generation = ++this.requestedGeneration;
        return this.replaceStreamGeneration(
            generation,
            this.activeTrackId,
            offsetSeconds,
        );
    }

    /**
     * Stops playback and invalidates any pending generation.
     */
    async stop(): Promise<void> {
        this.requestedGeneration++;
        this.activeGeneration = 0;
        this.activeTrackId = null;
        this.tracker.clear();
        this.stream.cancel();
        this.engine.reset();
        await this.stream.abort();
    }

    private async replaceStreamGeneration(
        generation: number,
        trackId: number,
        offsetSeconds: number,
    ): Promise<PlaybackSegment | null> {
        this.tracker.setTarget(trackId, offsetSeconds);

        await this.stream.abort();
        if (generation !== this.requestedGeneration) return null;

        const boundary = this.createSeekBoundary();

        this.engine.seek(offsetSeconds);

        const segment = this.tracker.commitTargetAtBoundary(boundary);
        if (!segment) return null;

        const didStart = await this.stream.start(
            this.createTrackUrl(trackId, offsetSeconds),
        );

        if (generation !== this.requestedGeneration) return null;
        if (!didStart) {
            this.tracker.clear();
            this.activeGeneration = 0;
            this.activeTrackId = null;
            this.engine.reset();
            return null;
        }

        this.activeGeneration = generation;
        this.activeTrackId = trackId;
        return segment;
    }

    /**
     * Captures the transport boundary used for seek generation commits.
     *
     * This boundary is aligned with the engine's monotonic transport clock,
     * not a hardware-confirmed audible timestamp.
     */
    private createSeekBoundary(): PlaybackSegmentBoundary {
        return {
            startTransportFrame: this.engine.transportFrame,
        };
    }

    private createTrackUrl(trackId: number, offsetSeconds: number): string {
        return this.serverClient.track(trackId, {
            sampleRate: this.engine.sampleRate,
            offset: offsetSeconds,
        });
    }
}
