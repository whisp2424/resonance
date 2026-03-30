import type { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import type {
    PlaybackSegment,
    PlaybackSegmentBoundary,
} from "@renderer/lib/audio/processing/PlaybackPositionTracker";

import { AudioServerClient } from "@renderer/lib/audio/AudioServerClient";
import { PlaybackPositionTracker } from "@renderer/lib/audio/processing/PlaybackPositionTracker";
import { AudioStream } from "@renderer/lib/audio/streaming/AudioStream";

export interface PlaybackSessionSnapshot {
    state: "idle" | "opening" | "active" | "draining";
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
 * A terminal transition that has been determined, but whose audible boundary
 * has not necessarily been reached yet.
 *
 * When a stream ends or errors, already-buffered PCM may still be draining
 * from the ring buffer. We keep this transition until the engine transport
 * clock reaches the exact frame where playback is truly finished.
 */
interface PendingTerminalTransition {
    type: "ended" | "errored";
    boundaryTransportFrame: number;
    trackPositionFrames: number;
    errorMessage?: string;
}

export type PlaybackSessionEvent =
    | {
          type: "ended";
          generation: number;
          trackId: number | null;
          trackPositionFrames: number;
      }
    | {
          type: "errored";
          generation: number;
          trackId: number | null;
          trackPositionFrames: number;
          message: string;
      }
    | {
          type: "stopped";
      };

/**
 * Coordinates a single seekable playback session for one active track.
 *
 * This is not a queue manager. It gives higher-level code a generation-safe
 * primitive for low-level play/seek/stop behavior and track-aware position.
 */
export class PlaybackSession {
    private readonly engine: AudioEngine;
    private readonly tracker: PlaybackPositionTracker;
    private readonly serverClient: AudioServerClient;
    private readonly stream: AudioStream;
    private readonly snapshotListeners = new Set<
        (snapshot: PlaybackSessionSnapshot) => void
    >();
    private readonly eventListeners = new Set<
        (event: PlaybackSessionEvent) => void
    >();

    private requestedGeneration = 0;
    private activeGeneration = 0;
    private activeTrackId: number | null = null;

    private pendingTerminalTransition: PendingTerminalTransition | null = null;
    private terminalWatcherId = 0;

    constructor(engine: AudioEngine, serverPort: number) {
        const buffer = engine.buffer;
        if (!buffer) {
            throw new Error(
                "PlaybackSession requires an initialized AudioEngine",
            );
        }

        this.engine = engine;
        this.tracker = new PlaybackPositionTracker(engine);
        this.serverClient = new AudioServerClient(serverPort);
        this.stream = new AudioStream(buffer, {
            onWriteEnd: (samplesWritten) => {
                this.handleStreamEnded(samplesWritten);
                return null;
            },
            onError: (message, samplesWritten) => {
                this.handleStreamError(message, samplesWritten);
            },
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

    subscribe(
        listener: (snapshot: PlaybackSessionSnapshot) => void,
    ): () => void {
        this.snapshotListeners.add(listener);
        listener(this.snapshot);
        return () => {
            this.snapshotListeners.delete(listener);
        };
    }

    subscribeEvents(
        listener: (event: PlaybackSessionEvent) => void,
    ): () => void {
        this.eventListeners.add(listener);
        return () => {
            this.eventListeners.delete(listener);
        };
    }

    async destroy(): Promise<void> {
        this.cancelTerminalWatcher();
        this.snapshotListeners.clear();
        this.eventListeners.clear();
        await this.stop();
    }

    get snapshot(): PlaybackSessionSnapshot {
        const isActive =
            this.activeGeneration > 0 && this.activeTrackId !== null;
        const pendingTrackId = this.tracker.target?.trackId ?? null;
        const currentTransportFrame = this.engine.transportFrame;
        const currentTrackPositionFrames = isActive
            ? this.tracker.positionFrames
            : null;
        const trackPositionFrames = this.pendingTerminalTransition
            ? currentTrackPositionFrames === null
                ? this.pendingTerminalTransition.trackPositionFrames
                : Math.min(
                      currentTrackPositionFrames,
                      this.pendingTerminalTransition.trackPositionFrames,
                  )
            : currentTrackPositionFrames;
        const trackPositionMilliseconds =
            trackPositionFrames === null
                ? null
                : Math.floor(
                      (trackPositionFrames * 1000) / this.engine.sampleRate,
                  );

        return {
            state: this.pendingTerminalTransition
                ? "draining"
                : isActive
                  ? "active"
                  : pendingTrackId !== null
                    ? "opening"
                    : "idle",
            generation: this.activeGeneration,
            activeTrackId: this.activeTrackId,
            pendingTrackId,
            transportFrame: currentTransportFrame,
            transportPositionFrames: this.engine.transportPositionFrames,
            transportPositionMilliseconds:
                this.engine.transportPositionMilliseconds,
            trackPositionFrames,
            trackPositionMilliseconds,
            starvationCount: this.engine.starvationCount,
        };
    }

    async playTrack(
        trackId: number,
        offsetSeconds = 0,
    ): Promise<PlaybackSegment | null> {
        const generation = ++this.requestedGeneration;
        return this.replaceStreamGeneration(generation, trackId, offsetSeconds);
    }

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

    async stop(): Promise<void> {
        this.requestedGeneration++;
        this.activeGeneration = 0;
        this.activeTrackId = null;
        this.pendingTerminalTransition = null;
        this.cancelTerminalWatcher();
        this.tracker.clear();
        this.stream.cancel();
        await this.engine.pause();
        this.engine.reset();
        await this.stream.abort();
        this.publishSnapshot();
        this.publishEvent({ type: "stopped" });
    }

    private async replaceStreamGeneration(
        generation: number,
        trackId: number,
        offsetSeconds: number,
    ): Promise<PlaybackSegment | null> {
        this.pendingTerminalTransition = null;
        this.cancelTerminalWatcher();
        this.tracker.setTarget(trackId, offsetSeconds);
        this.publishSnapshot();

        await this.stream.abort();
        if (generation !== this.requestedGeneration) return null;

        this.activeGeneration = 0;
        this.activeTrackId = null;
        this.tracker.clearActive();
        this.publishSnapshot();

        const boundary = this.createSeekBoundary(offsetSeconds);
        const startResult = await this.stream.start(
            this.createTrackUrl(trackId, offsetSeconds),
        );

        if (generation !== this.requestedGeneration) return null;

        if (!startResult.success) {
            this.tracker.clear();
            this.activeGeneration = 0;
            this.activeTrackId = null;
            await this.engine.pause();
            this.engine.reset();

            if (startResult.error === "failed") {
                this.publishEvent({
                    type: "errored",
                    generation,
                    trackId,
                    trackPositionFrames: 0,
                    message: startResult.message,
                });
            }

            this.publishSnapshot();
            return null;
        }

        const segment = this.tracker.commitTargetAtBoundary(boundary);
        if (!segment) {
            this.tracker.clear();
            this.activeGeneration = 0;
            this.activeTrackId = null;
            await this.engine.pause();
            this.engine.reset();
            await this.stream.abort();
            this.publishSnapshot();
            return null;
        }

        if (startResult.data === "ended") {
            this.activeGeneration = generation;
            this.activeTrackId = trackId;
            this.handleImmediateEnd(segment.startOffsetFrames);
            return segment;
        }

        try {
            await this.engine.play();
        } catch (err) {
            this.tracker.clear();
            this.activeGeneration = 0;
            this.activeTrackId = null;
            await this.stream.abort();
            this.publishEvent({
                type: "errored",
                generation,
                trackId,
                trackPositionFrames: segment.startOffsetFrames,
                message: err instanceof Error ? err.message : String(err),
            });
            this.publishSnapshot();
            return null;
        }

        this.activeGeneration = generation;
        this.activeTrackId = trackId;
        this.publishSnapshot();
        return segment;
    }

    private handleImmediateEnd(trackPositionFrames: number): void {
        const generation = this.activeGeneration;
        const trackId = this.activeTrackId;

        this.activeGeneration = 0;
        this.activeTrackId = null;
        this.tracker.clearActive();
        this.publishSnapshot();
        this.publishEvent({
            type: "ended",
            generation,
            trackId,
            trackPositionFrames,
        });
    }

    private handleStreamEnded(samplesWritten: number): void {
        const boundary =
            this.tracker.createBoundaryAfterActiveSegment(samplesWritten);
        const activeSegment = this.tracker.active;
        if (!boundary || !activeSegment) return;

        this.setPendingTerminalTransition({
            type: "ended",
            boundaryTransportFrame: boundary.startTransportFrame,
            trackPositionFrames:
                activeSegment.startOffsetFrames + samplesWritten,
        });
    }

    private handleStreamError(message: string, samplesWritten: number): void {
        const boundary =
            this.tracker.createBoundaryAfterActiveSegment(samplesWritten);
        const activeSegment = this.tracker.active;
        if (!activeSegment && this.activeTrackId === null) return;

        this.setPendingTerminalTransition({
            type: "errored",
            boundaryTransportFrame:
                boundary?.startTransportFrame ?? this.engine.transportFrame,
            trackPositionFrames: activeSegment
                ? activeSegment.startOffsetFrames + samplesWritten
                : 0,
            errorMessage: message,
        });
    }

    private setPendingTerminalTransition(
        transition: PendingTerminalTransition,
    ): void {
        this.pendingTerminalTransition = transition;
        this.publishSnapshot();
        void this.watchTerminalBoundary(++this.terminalWatcherId);
    }

    private async watchTerminalBoundary(watcherId: number): Promise<void> {
        while (watcherId === this.terminalWatcherId) {
            const transition = this.pendingTerminalTransition;
            if (!transition) return;

            if (
                this.engine.transportFrame >= transition.boundaryTransportFrame
            ) {
                const generation = this.activeGeneration;
                const trackId = this.activeTrackId;

                this.pendingTerminalTransition = null;
                this.activeGeneration = 0;
                this.activeTrackId = null;
                this.tracker.clearActive();
                this.publishSnapshot();

                if (transition.type === "ended") {
                    this.publishEvent({
                        type: "ended",
                        generation,
                        trackId,
                        trackPositionFrames: transition.trackPositionFrames,
                    });
                } else {
                    this.publishEvent({
                        type: "errored",
                        generation,
                        trackId,
                        trackPositionFrames: transition.trackPositionFrames,
                        message: transition.errorMessage ?? "Playback failed",
                    });
                }

                return;
            }

            await new Promise((resolve) => window.setTimeout(resolve, 25));
        }
    }

    private cancelTerminalWatcher(): void {
        this.terminalWatcherId++;
    }

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

    private publishSnapshot(): void {
        const snapshot = this.snapshot;
        for (const listener of this.snapshotListeners) listener(snapshot);
    }

    private publishEvent(event: PlaybackSessionEvent): void {
        for (const listener of this.eventListeners) listener(event);
    }
}
