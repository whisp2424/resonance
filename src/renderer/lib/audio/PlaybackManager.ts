import type { StagingBufferData } from "@renderer/lib/audio/processing/StagingBuffer";
import type { Err, Result } from "@shared/types/result";

import { AudioServerClient } from "@renderer/lib/audio/AudioServerClient";
import { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import { StagingBuffer } from "@renderer/lib/audio/processing/StagingBuffer";
import { TrackTimeline } from "@renderer/lib/audio/processing/TrackTimeline";
import processorPath from "@renderer/lib/audio/processing/audioProcessor?worker&url";
import { AudioStream } from "@renderer/lib/audio/streaming/AudioStream";
import { error, ok } from "@shared/types/result";
import { getErrorMessage, log } from "@shared/utils/logger";

// ---- Types ------------------------------------------------------------------

export type PlaybackError = "stream_error" | "server_error" | "unknown";

export interface PlaybackManagerCallbacks {
    onTrackChanged: (trackId: number) => void;
    onPlaybackEnded: () => void;
    onError: (error: Err<PlaybackError>) => void;
}

type LifecycleState = "uninitialized" | "ready" | "destroyed";

interface AudioComponents {
    engine: AudioEngine;
    stream: AudioStream;
    stagingBuffer: StagingBuffer;
    timeline: TrackTimeline;
    serverClient: AudioServerClient;
}

export class PlaybackManager {
    private lifecycle: LifecycleState = "uninitialized";
    private audioComponents: AudioComponents | null = null;

    private currentTrackId: number | null = null;
    private nextTrackId: number | null = null;

    private readonly callbacks: PlaybackManagerCallbacks;

    constructor(callbacks: PlaybackManagerCallbacks) {
        this.callbacks = callbacks;
    }

    async init(): Promise<Result<void, "init_error">> {
        if (this.lifecycle !== "uninitialized") {
            return error(
                `init() can't be called during lifecycle state "${this.lifecycle}"`,
                "init_error",
            );
        }

        try {
            const port = await electron.invoke("server:getPort");
            const serverClient = new AudioServerClient(port);
            const engine = new AudioEngine(processorPath);

            await engine.init();

            const timeline = new TrackTimeline({
                onTrackChanged: (trackId) =>
                    this.callbacks.onTrackChanged(trackId),
                onPlaybackEnded: () => this.callbacks.onPlaybackEnded(),
            });

            const stagingBuffer = new StagingBuffer(engine.sampleRate);
            const stream = new AudioStream(engine.buffer!, {
                onWriteEnd: (samplesWritten) => this.onWriteEnd(samplesWritten),
                onError: () => this.onStreamError(),
            });

            this.audioComponents = {
                engine,
                stream,
                stagingBuffer,
                timeline,
                serverClient,
            };

            this.lifecycle = "ready";
            return ok(undefined);
        } catch (err) {
            log(getErrorMessage(err), "PlaybackManager", "error");
            return error("Couldn't initialize PlaybackManager", "init_error");
        }
    }

    async destroy(): Promise<void> {
        if (this.lifecycle === "destroyed") return;
        this.lifecycle = "destroyed";

        const audio = this.audioComponents;
        this.audioComponents = null;
        this.currentTrackId = null;
        this.nextTrackId = null;

        if (!audio) return;
        audio.stream.abort();
        audio.stagingBuffer.abort();
        await audio.engine.destroy();
    }

    async load(
        trackId: number,
        startPosition = 0,
    ): Promise<Result<void, PlaybackError>> {
        const audio = this.audioComponents;
        if (!audio) return this.notReady("load");

        audio.stream.abort();
        audio.stagingBuffer.abort();
        audio.engine.seek(startPosition);
        audio.timeline.reset(trackId);

        this.currentTrackId = trackId;

        const url = audio.serverClient.track(trackId, {
            sampleRate: audio.engine.sampleRate,
            offset: startPosition > 0 ? startPosition : undefined,
        });

        try {
            await audio.stream.start(url);
            return ok(undefined);
        } catch (err) {
            const msg = getErrorMessage(err);
            log(msg, "PlaybackManager", "error");
            return error(msg, "stream_error");
        }
    }

    preload(trackId: number): void {
        const audio = this.audioComponents;
        if (!audio) return;
        this.nextTrackId = trackId;

        const url = audio.serverClient.track(trackId, {
            sampleRate: audio.engine.sampleRate,
        });

        void audio.stagingBuffer.load(url);
    }

    async play(): Promise<void> {
        await this.audioComponents?.engine.play();
    }

    async pause(): Promise<void> {
        await this.audioComponents?.engine.pause();
    }

    async seek(position: number): Promise<void> {
        const audio = this.audioComponents;
        if (!audio || this.currentTrackId === null) return;

        audio.stream.abort();
        audio.stagingBuffer.abort();
        audio.engine.seek(position);
        audio.timeline.reset(this.currentTrackId);

        if (this.nextTrackId !== null) {
            const nextUrl = audio.serverClient.track(this.nextTrackId, {
                sampleRate: audio.engine.sampleRate,
            });

            void audio.stagingBuffer.load(nextUrl);
        }

        const url = audio.serverClient.track(this.currentTrackId, {
            sampleRate: audio.engine.sampleRate,
            offset: position > 0 ? position : undefined,
        });

        await audio.stream.start(url);
    }

    setVolume(value: number): void {
        if (this.audioComponents) this.audioComponents.engine.volume = value;
    }

    async setOutputDevice(deviceId: string): Promise<void> {
        await this.audioComponents?.engine.setOutputDevice(deviceId);
    }

    /**
     * Returns the current playback position in seconds and drives TrackTimeline
     * resolution.
     *
     * Must be called frequently enough to avoid missing a full ring buffer
     * wrap (~20s at 44.1kHz).
     */
    getPosition(): number {
        const audio = this.audioComponents;
        if (!audio) return 0;
        audio.timeline.resolve(audio.engine.consumedSamples);
        return audio.engine.position;
    }

    private onWriteEnd(samplesWritten: number): {
        stagingData: StagingBufferData;
        nextTrackUrl: string;
    } | null {
        const audio = this.audioComponents;
        if (!audio) return null;

        const nextId = this.nextTrackId;

        if (nextId === null) {
            audio.timeline.markFinalBoundary(samplesWritten);
            return null;
        }

        audio.timeline.addBoundary(nextId, samplesWritten);

        if (!audio.stagingBuffer.data.isComplete) {
            log(
                `Staging buffer not ready for track ${nextId}, gapless transition skipped`,
                "PlaybackManager",
                "warning",
            );
            return null;
        }

        const nextUrl = audio.serverClient.track(nextId, {
            sampleRate: audio.engine.sampleRate,
        });

        return { stagingData: audio.stagingBuffer.data, nextTrackUrl: nextUrl };
    }

    private onStreamError(): void {
        this.callbacks.onError(
            error("Stream failed for current track", "stream_error"),
        );
    }

    private notReady(method: string): Result<void> {
        return error(
            `${method}() can't be called during lifecycle state "${this.lifecycle}"`,
            "unknown",
        );
    }
}
