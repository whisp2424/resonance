import type { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import type {
    PlaybackSegment,
    PlaybackSegmentBoundary,
} from "@renderer/lib/audio/processing/PlaybackPositionTracker";

import { AudioServerClient } from "@renderer/lib/audio/AudioServerClient";
import { PlaybackPositionTracker } from "@renderer/lib/audio/processing/PlaybackPositionTracker";
import { AudioStream } from "@renderer/lib/audio/streaming/AudioStream";

export interface PlaybackSessionSnapshot {
    state: "idle" | "opening" | "active";
    generation: number;
    activeTrackId: number | null;
    pendingTrackId: number | null;
    transportFrame: number;
    transportPositionFrames: number;
    transportPositionMilliseconds: number;
    trackPositionFrames: number | null;
    trackPositionMilliseconds: number | null;
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
        const isActive =
            this.activeGeneration > 0 && this.activeTrackId !== null;
        const pendingTrackId = this.tracker.target?.trackId ?? null;

        return {
            state: isActive
                ? "active"
                : pendingTrackId !== null
                  ? "opening"
                  : "idle",
            generation: this.activeGeneration,
            activeTrackId: this.activeTrackId,
            pendingTrackId,
            transportFrame: this.engine.transportFrame,
            transportPositionFrames: this.engine.transportPositionFrames,
            transportPositionMilliseconds:
                this.engine.transportPositionMilliseconds,
            trackPositionFrames: isActive ? this.tracker.positionFrames : null,
            trackPositionMilliseconds: isActive
                ? this.tracker.positionMilliseconds
                : null,
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
        const seekTrackId = this.tracker.target?.trackId ?? this.activeTrackId;
        if (seekTrackId === null) return null;

        const generation = ++this.requestedGeneration;
        return this.replaceStreamGeneration(
            generation,
            seekTrackId,
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
        await this.engine.pause();
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

        this.activeGeneration = 0;
        this.activeTrackId = null;
        this.tracker.clearActive();

        const boundary = this.createSeekBoundary(offsetSeconds);

        const didStart = await this.stream.start(
            this.createTrackUrl(trackId, offsetSeconds),
        );

        if (generation !== this.requestedGeneration) return null;
        if (!didStart) {
            this.tracker.clear();
            this.activeGeneration = 0;
            this.activeTrackId = null;
            await this.engine.pause();
            this.engine.reset();
            return null;
        }

        await this.engine.play();

        const segment = this.tracker.commitTargetAtBoundary(boundary);
        if (!segment) {
            this.tracker.clear();
            this.activeGeneration = 0;
            this.activeTrackId = null;
            await this.engine.pause();
            this.engine.reset();
            await this.stream.abort();
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
    private createSeekBoundary(offsetSeconds: number): PlaybackSegmentBoundary {
        return {
            startTransportFrame: this.engine.seek(offsetSeconds),
        };
    }

    private createTrackUrl(trackId: number, offsetSeconds: number): string {
        return this.serverClient.track(trackId, {
            sampleRate: this.engine.sampleRate,
            offset: offsetSeconds,
        });
    }
}
