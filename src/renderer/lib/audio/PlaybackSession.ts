import type { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import type { AudioStreamStartResult } from "@renderer/lib/audio/streaming/AudioStream";

import { AudioServerClient } from "@renderer/lib/audio/AudioServerClient";
import { AudioStream } from "@renderer/lib/audio/streaming/AudioStream";
import { getErrorMessage } from "@shared/utils/logger";

/**
 * Summary of the current low-level playback session.
 *
 * `state` reflects the current control-plane state only. Terminal conditions
 * like ended or error are emitted as events instead of being stored here.
 */
export interface PlaybackSessionSnapshot {
    /** Public session state. */
    state: "idle" | "opening" | "playing";

    /** Monotonic request generation currently represented by the session. */
    generation: number;

    /** Track id of the currently playing track, if any. */
    activeTrackId: number | null;

    /** Track id of the request currently opening, if any. */
    pendingTrackId: number | null;

    /** Monotonic transport frame consumed by the audio thread. */
    transportFrame: number;

    /** Current transport position in output frames. */
    transportPositionFrames: number;

    /** Current transport position in whole milliseconds. */
    transportPositionMilliseconds: number;

    /** Current track position in output frames, if a track is represented. */
    trackPositionFrames: number | null;

    /** Current track position in whole milliseconds, if available. */
    trackPositionMilliseconds: number | null;

    /** Number of starvation episodes reported by the worklet. */
    starvationCount: number;
}

/** One-shot low-level playback lifecycle events. */
export type PlaybackSessionEvent =
    | {
          type: "ended";

          /** Request generation that produced this event. */
          generation: number;

          /** Track id that ended, if known. */
          trackId: number | null;

          /** Final track position at the terminal boundary, in frames. */
          trackPositionFrames: number;
      }
    | {
          type: "error";

          /** Request generation that produced this event. */
          generation: number;

          /** Track id that failed, if known. */
          trackId: number | null;

          /** Track position reached before the error became audible. */
          trackPositionFrames: number;

          /** Human-readable error message for diagnostics. */
          message: string;
      }
    | { type: "stopped" };

/** A single-track play or seek request. */
interface TrackRequest {
    /** Monotonic request token used to invalidate stale async work. */
    generation: number;

    /** Track to start or seek within. */
    trackId: number;

    /** Requested starting offset, in seconds. */
    offsetSeconds: number;
}

/**
 * The currently active track mapped onto the engine transport clock.
 */
interface ActiveTrack {
    /** Request that created this active playback lineage. */
    request: TrackRequest;

    /** Track offset, in frames, when playback reached `startTransportFrame`. */
    startOffsetFrames: number;

    /** Transport frame where this track became active. */
    startTransportFrame: number;

    /** Pending terminal boundary while buffered audio is still draining. */
    terminal: PendingTerminalTransition | null;
}

/**
 * A pending terminal transition for buffered audio that is still audible.
 *
 * When the stream side finishes before the ring buffer drains, playback is
 * still effectively playing. This transition records the exact frame where the
 * audible tail ends so the session can emit the terminal event at the right
 * time.
 */
interface PendingTerminalTransition {
    type: "ended" | "error";
    endTransportFrame: number;
    endTrackPositionFrames: number;
    errorMessage?: string;
}

type SessionState =
    | { type: "idle" }
    | { type: "opening"; request: TrackRequest }
    | { type: "playing"; track: ActiveTrack };

/**
 * Coordinates low-level playback for one track at a time.
 *
 * It owns play/seek replacement, maps engine transport time onto the current
 * track, and emits terminal events only when playback has audibly finished.
 */
export class PlaybackSession {
    private readonly engine: AudioEngine;
    private readonly serverClient: AudioServerClient;
    private readonly stream: AudioStream;
    private readonly snapshotListeners = new Set<
        (snapshot: PlaybackSessionSnapshot) => void
    >();
    private readonly eventListeners = new Set<
        (event: PlaybackSessionEvent) => void
    >();

    private requestedGeneration = 0;
    private state: SessionState = { type: "idle" };
    private terminalWatcherId = 0;

    constructor(engine: AudioEngine, serverPort: number) {
        const buffer = engine.buffer;
        if (!buffer) {
            throw new Error(
                "PlaybackSession requires an initialized AudioEngine",
            );
        }

        this.engine = engine;
        this.serverClient = new AudioServerClient(serverPort);
        this.stream = new AudioStream(buffer, {
            onWriteEnd: (framesWritten) => {
                this.handleStreamEnded(framesWritten);
            },
            onError: (message, framesWritten) => {
                this.handleStreamError(message, framesWritten);
            },
        });
    }

    /** Monotonic generation id of the currently represented request, if any. */
    get generation(): number {
        return this.getCurrentRequest()?.generation ?? 0;
    }

    /** The track currently represented by the playing state, if any. */
    get currentTrackId(): number | null {
        if (this.state.type !== "playing") return null;
        return this.state.track.request.trackId;
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

    /** Stops the session permanently and removes all listeners. */
    async destroy(): Promise<void> {
        this.cancelTerminalWatcher();
        this.snapshotListeners.clear();
        this.eventListeners.clear();
        await this.stop();
    }

    /**
     * Summary of the current low-level playback session.
     *
     * Terminal conditions are emitted as events, not stored in this snapshot.
     */
    get snapshot(): PlaybackSessionSnapshot {
        return this.buildSnapshot();
    }

    async playTrack(trackId: number, offsetSeconds = 0): Promise<boolean> {
        return this.replaceWithRequest(
            this.createRequest(trackId, offsetSeconds),
        );
    }

    async seek(offsetSeconds: number): Promise<boolean> {
        const trackId = this.getCurrentRequest()?.trackId;
        if (trackId == null) return false;

        return this.replaceWithRequest(
            this.createRequest(trackId, offsetSeconds),
        );
    }

    async stop(): Promise<void> {
        this.requestedGeneration++;
        this.cancelTerminalWatcher();
        this.state = { type: "idle" };
        this.stream.cancel();
        await this.engine.pause();
        this.engine.reset();
        await this.stream.abort();
        this.publishSnapshot();
        this.emitEvent({ type: "stopped" });
    }

    private createRequest(
        trackId: number,
        offsetSeconds: number,
    ): TrackRequest {
        return {
            generation: ++this.requestedGeneration,
            trackId,
            offsetSeconds,
        };
    }

    private async replaceWithRequest(request: TrackRequest): Promise<boolean> {
        this.cancelTerminalWatcher();
        this.state = { type: "opening", request };
        this.publishSnapshot();

        await this.stream.abort();
        if (!this.isCurrentRequest(request)) return false;

        const startTransportFrame = this.engine.seek(request.offsetSeconds);
        const startResult = await this.stream.start(
            this.createTrackUrl(request),
        );

        if (!this.isCurrentRequest(request)) return false;

        if (!startResult.success) {
            await this.handleRequestFailure(request, startResult);
            return false;
        }

        const activeTrack = this.startPlaying(request, startTransportFrame);

        if (startResult.data === "ended") {
            this.handleImmediateEnd(activeTrack);
            return true;
        }

        try {
            await this.engine.play();
        } catch (err) {
            await this.handleResumeFailure(activeTrack, err);
            return false;
        }

        this.publishSnapshot();
        return true;
    }

    /** Promotes an opened request into the active playing state. */
    private startPlaying(
        request: TrackRequest,
        startTransportFrame: number,
    ): ActiveTrack {
        const activeTrack: ActiveTrack = {
            request,
            startOffsetFrames: this.secondsToFrames(request.offsetSeconds),
            startTransportFrame,
            terminal: null,
        };

        this.state = { type: "playing", track: activeTrack };
        this.publishSnapshot();
        return activeTrack;
    }

    private async handleRequestFailure(
        request: TrackRequest,
        startResult: Extract<AudioStreamStartResult, { success: false }>,
    ): Promise<void> {
        this.state = { type: "idle" };
        await this.engine.pause();
        this.engine.reset();

        if (startResult.error === "failed")
            this.emitErrorEvent(request, 0, startResult.message);

        this.publishSnapshot();
    }

    private async handleResumeFailure(
        activeTrack: ActiveTrack,
        err: unknown,
    ): Promise<void> {
        this.state = { type: "idle" };
        await this.engine.pause();
        this.engine.reset();
        await this.stream.abort();
        this.emitErrorEvent(
            activeTrack.request,
            activeTrack.startOffsetFrames,
            getErrorMessage(err),
        );

        this.publishSnapshot();
    }

    private handleImmediateEnd(activeTrack: ActiveTrack): void {
        this.state = { type: "idle" };
        this.publishSnapshot();
        this.emitEndedEvent(activeTrack.request, activeTrack.startOffsetFrames);
    }

    private handleStreamEnded(framesWritten: number): void {
        const transition = this.createTerminalTransition(
            "ended",
            framesWritten,
        );
        if (!transition || this.state.type !== "playing") return;

        this.state.track.terminal = transition;
        this.publishSnapshot();
        this.watchTerminalBoundary(
            this.state.track.request,
            ++this.terminalWatcherId,
        );
    }

    private handleStreamError(message: string, framesWritten: number): void {
        const transition = this.createTerminalTransition(
            "error",
            framesWritten,
            message,
        );
        if (!transition || this.state.type !== "playing") return;

        this.state.track.terminal = transition;
        this.publishSnapshot();
        this.watchTerminalBoundary(
            this.state.track.request,
            ++this.terminalWatcherId,
        );
    }

    private createTerminalTransition(
        type: PendingTerminalTransition["type"],
        framesWritten: number,
        errorMessage?: string,
    ): PendingTerminalTransition | null {
        if (this.state.type !== "playing") return null;

        return {
            type,
            endTransportFrame:
                this.state.track.startTransportFrame + framesWritten,
            endTrackPositionFrames:
                this.state.track.startOffsetFrames + framesWritten,
            errorMessage,
        };
    }

    private async watchTerminalBoundary(
        request: TrackRequest,
        watcherId: number,
    ): Promise<void> {
        while (watcherId === this.terminalWatcherId) {
            const activeTrack = this.getPlayingTrack(request);
            if (!activeTrack) return;

            const terminal = activeTrack.terminal;
            if (!terminal) return;

            if (this.engine.transportFrame >= terminal.endTransportFrame) {
                this.finishTerminalTransition(request, terminal);
                return;
            }

            await new Promise((resolve) => window.setTimeout(resolve, 25));
        }
    }

    private finishTerminalTransition(
        request: TrackRequest,
        terminal: PendingTerminalTransition,
    ): void {
        this.state = { type: "idle" };
        this.publishSnapshot();

        if (terminal.type === "ended") {
            this.emitEndedEvent(request, terminal.endTrackPositionFrames);
            return;
        }

        this.emitErrorEvent(
            request,
            terminal.endTrackPositionFrames,
            terminal.errorMessage ?? "Playback failed",
        );
    }

    /** Builds the public snapshot from the current session state. */
    private buildSnapshot(): PlaybackSessionSnapshot {
        const currentRequest = this.getCurrentRequest();
        const transportPosition = this.getTransportPositionSnapshot();
        const trackPosition = this.getTrackPositionSnapshot();

        return {
            state: this.getPublicState(),
            generation: currentRequest?.generation ?? 0,
            activeTrackId: this.getActiveTrackId(),
            pendingTrackId: this.getPendingTrackId(),
            transportFrame: this.engine.transportFrame,
            transportPositionFrames: transportPosition.frames,
            transportPositionMilliseconds: transportPosition.milliseconds,
            trackPositionFrames: trackPosition.frames,
            trackPositionMilliseconds: trackPosition.milliseconds,
            starvationCount: this.engine.starvationCount,
        };
    }

    /** Returns the public session state exposed to higher layers. */
    private getPublicState(): PlaybackSessionSnapshot["state"] {
        switch (this.state.type) {
            case "opening":
                return "opening";
            case "playing":
                return "playing";
            default:
                return "idle";
        }
    }

    /** Returns the request currently represented by the session, if any. */
    private getCurrentRequest(): TrackRequest | null {
        switch (this.state.type) {
            case "opening":
                return this.state.request;
            case "playing":
                return this.state.track.request;
            default:
                return null;
        }
    }

    /** Returns the active track id if the session is currently playing. */
    private getActiveTrackId(): number | null {
        return this.state.type === "playing"
            ? this.state.track.request.trackId
            : null;
    }

    /** Returns the pending track id while a request is opening. */
    private getPendingTrackId(): number | null {
        return this.state.type === "opening"
            ? this.state.request.trackId
            : null;
    }

    /**
     * Returns the current track position in frames.
     *
     * If a terminal transition is draining, the live position is clamped to the
     * track's known audible end frame.
     */
    private getCurrentTrackPositionFrames(): number | null {
        if (this.state.type !== "playing") return null;

        const liveTrackPositionFrames =
            this.state.track.startOffsetFrames +
            (this.engine.transportFrame - this.state.track.startTransportFrame);

        if (!this.state.track.terminal) {
            return liveTrackPositionFrames;
        }

        return Math.min(
            liveTrackPositionFrames,
            this.state.track.terminal.endTrackPositionFrames,
        );
    }

    private getTransportPositionSnapshot(): {
        frames: number;
        milliseconds: number;
    } {
        return {
            frames: this.engine.transportPositionFrames,
            milliseconds: this.engine.transportPositionMilliseconds,
        };
    }

    private getTrackPositionSnapshot(): {
        frames: number | null;
        milliseconds: number | null;
    } {
        const frames = this.getCurrentTrackPositionFrames();

        return {
            frames,
            milliseconds:
                frames === null ? null : this.framesToMilliseconds(frames),
        };
    }

    /** True when this request is still the latest requested generation. */
    private isCurrentRequest(request: TrackRequest): boolean {
        return request.generation === this.requestedGeneration;
    }

    /**
     * Returns the currently playing track when it still matches the request.
     */
    private getPlayingTrack(request: TrackRequest): ActiveTrack | null {
        const state = this.state;
        if (state.type !== "playing") return null;
        if (state.track.request.generation !== request.generation) return null;
        return state.track;
    }

    /** Converts seconds into whole output frames. */
    private secondsToFrames(seconds: number): number {
        return Math.max(0, Math.floor(seconds * this.engine.sampleRate));
    }

    /** Converts a whole-frame position into whole milliseconds. */
    private framesToMilliseconds(frames: number): number {
        return Math.floor((frames * 1000) / this.engine.sampleRate);
    }

    /** Creates the server URL for a single track request. */
    private createTrackUrl(request: TrackRequest): string {
        return this.serverClient.track(request.trackId, {
            sampleRate: this.engine.sampleRate,
            offset: request.offsetSeconds,
        });
    }

    /** Invalidates any in-flight terminal watcher loop. */
    private cancelTerminalWatcher(): void {
        this.terminalWatcherId++;
    }

    private publishSnapshot(): void {
        const snapshot = this.snapshot;
        for (const listener of this.snapshotListeners) listener(snapshot);
    }

    private emitEvent(event: PlaybackSessionEvent): void {
        for (const listener of this.eventListeners) listener(event);
    }

    private emitEndedEvent(
        request: TrackRequest,
        trackPositionFrames: number,
    ): void {
        this.emitEvent({
            type: "ended",
            generation: request.generation,
            trackId: request.trackId,
            trackPositionFrames,
        });
    }

    private emitErrorEvent(
        request: TrackRequest,
        trackPositionFrames: number,
        message: string,
    ): void {
        this.emitEvent({
            type: "error",
            generation: request.generation,
            trackId: request.trackId,
            trackPositionFrames,
            message,
        });
    }
}
