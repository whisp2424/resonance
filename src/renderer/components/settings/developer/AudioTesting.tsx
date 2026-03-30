import type { PlaybackSessionSnapshot } from "@renderer/lib/audio/PlaybackSession";
import type { TrackResult } from "@shared/types/library";

import Button from "@renderer/components/ui/Button";
import {
    Field,
    FieldDescription,
    FieldLabel,
} from "@renderer/components/ui/Field";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import TextInput from "@renderer/components/ui/TextInput";
import { PlaybackSession } from "@renderer/lib/audio/PlaybackSession";
import { AudioEngine } from "@renderer/lib/audio/processing/AudioEngine";
import AudioProcessor from "@renderer/lib/audio/processing/audioProcessor?worker&url";
import { useAudioStore } from "@renderer/lib/audio/state/audioStore";
import { getErrorMessage, log } from "@shared/utils/logger";
import clsx from "clsx";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const SNAPSHOT_INTERVAL_MS = 100;
const SEEK_SPAM_DELAYS_MS = [0, 60, 120, 180, 240, 300];
const IDLE_SNAPSHOT: PlaybackSessionSnapshot = {
    state: "idle",
    generation: 0,
    activeTrackId: null,
    pendingTrackId: null,
    transportFrame: 0,
    transportPositionFrames: 0,
    transportPositionMilliseconds: 0,
    trackPositionFrames: null,
    trackPositionMilliseconds: null,
    starvationCount: 0,
};

interface TrackSummary {
    id: number;
    title: string;
    artist: string;
    album: string;
    durationMs: number | null;
}

export default function AudioTesting() {
    const {
        outputDevices,
        isLoading,
        error: outputDeviceError,
    } = useAudioStore();

    const engineRef = useRef<AudioEngine | null>(null);
    const sessionRef = useRef<PlaybackSession | null>(null);
    const seekSpamRunRef = useRef(0);

    const [trackIdInput, setTrackIdInput] = useState("1");
    const [playOffsetInput, setPlayOffsetInput] = useState("0");
    const [seekOffsetInput, setSeekOffsetInput] = useState("30");
    const [selectedOutputDeviceId, setSelectedOutputDeviceId] =
        useState("default");
    const [isInitializing, setIsInitializing] = useState(false);
    const [isBusy, setIsBusy] = useState(false);
    const [serverPort, setServerPort] = useState<number | null>(null);
    const [snapshot, setSnapshot] =
        useState<PlaybackSessionSnapshot>(IDLE_SNAPSHOT);
    const [trackSummary, setTrackSummary] = useState<TrackSummary | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [eventLog, setEventLog] = useState<string[]>([]);

    const selectedTrackId = useMemo(
        () => parseInteger(trackIdInput),
        [trackIdInput],
    );
    const playOffsetSeconds = useMemo(
        () => parseNumber(playOffsetInput),
        [playOffsetInput],
    );
    const seekOffsetSeconds = useMemo(
        () => parseNumber(seekOffsetInput),
        [seekOffsetInput],
    );

    const appendEvent = useCallback(function appendEvent(message: string) {
        setEventLog((current) => [message, ...current].slice(0, 18));
        log(message, "debug:audio", "info");
    }, []);

    const syncSnapshot = useCallback(function syncSnapshot() {
        const session = sessionRef.current;
        setSnapshot(session ? session.snapshot : IDLE_SNAPSHOT);
    }, []);

    const destroyAudioRuntime = useCallback(
        async function destroyAudioRuntime() {
            seekSpamRunRef.current++;

            const session = sessionRef.current;
            const engine = engineRef.current;

            sessionRef.current = null;
            engineRef.current = null;
            setServerPort(null);
            setSnapshot(IDLE_SNAPSHOT);

            if (session) await session.destroy();
            if (engine) await engine.destroy();
        },
        [],
    );

    const applyOutputDevice = useCallback(
        async function applyOutputDevice(deviceId: string) {
            const engine = engineRef.current;
            if (!engine) return;

            const resolvedDeviceId = deviceId === "default" ? "" : deviceId;

            const result = await engine.setOutputDevice(resolvedDeviceId);
            if (!result.success) {
                setErrorMessage(result.message);
                appendEvent(`output device switch failed: ${result.message}`);
                return;
            }

            try {
                appendEvent(
                    resolvedDeviceId
                        ? `output device set to ${resolvedDeviceId}`
                        : "output device reset to system default",
                );
            } catch (err) {
                const message = getErrorMessage(err);
                setErrorMessage(message);
                appendEvent(`output device switch failed: ${message}`);
            }
        },
        [appendEvent],
    );

    const ensureAudioRuntime = useCallback(
        async function ensureAudioRuntime() {
            if (sessionRef.current && engineRef.current)
                return sessionRef.current;

            setIsInitializing(true);
            setErrorMessage(null);

            try {
                const port = await electron.invoke("server:getPort");
                const engine = new AudioEngine(AudioProcessor);
                await engine.init();

                if (selectedOutputDeviceId !== "default") {
                    const result = await engine.setOutputDevice(
                        selectedOutputDeviceId,
                    );

                    if (!result.success) {
                        setErrorMessage(result.message);
                        appendEvent(
                            `audio runtime output device failed: ${result.message}`,
                        );
                    }
                }

                const session = new PlaybackSession(engine, port);
                engineRef.current = engine;
                sessionRef.current = session;
                setServerPort(port);
                setSnapshot(session.snapshot);
                appendEvent(
                    `audio runtime initialized on port ${String(port)}`,
                );

                return session;
            } catch (err) {
                const message = getErrorMessage(err);
                setErrorMessage(message);
                appendEvent(`audio runtime init failed: ${message}`);
                await destroyAudioRuntime();
                return null;
            } finally {
                setIsInitializing(false);
            }
        },
        [appendEvent, destroyAudioRuntime, selectedOutputDeviceId],
    );

    const handlePlay = useCallback(
        async function handlePlay() {
            if (selectedTrackId === null || playOffsetSeconds === null) {
                setErrorMessage("Enter a valid track id and play offset.");
                return;
            }

            const session = await ensureAudioRuntime();
            if (!session) return;

            setIsBusy(true);
            setErrorMessage(null);

            try {
                const segment = await session.playTrack(
                    selectedTrackId,
                    playOffsetSeconds,
                );
                if (!segment) {
                    setErrorMessage("Playback did not start.");
                    appendEvent("play request failed closed");
                } else {
                    appendEvent(
                        `play track ${String(selectedTrackId)} at ${playOffsetSeconds.toFixed(3)}s`,
                    );
                }
                syncSnapshot();
            } finally {
                setIsBusy(false);
            }
        },
        [
            appendEvent,
            ensureAudioRuntime,
            playOffsetSeconds,
            selectedTrackId,
            syncSnapshot,
        ],
    );

    const handleSeek = useCallback(
        async function handleSeek() {
            if (seekOffsetSeconds === null) {
                setErrorMessage("Enter a valid seek offset.");
                return;
            }

            const session = await ensureAudioRuntime();
            if (!session) return;

            setIsBusy(true);
            setErrorMessage(null);

            try {
                const segment = await session.seek(seekOffsetSeconds);
                if (!segment) {
                    setErrorMessage("Seek failed or was superseded.");
                    appendEvent("seek request failed closed");
                } else {
                    appendEvent(`seek to ${seekOffsetSeconds.toFixed(3)}s`);
                }
                syncSnapshot();
            } finally {
                setIsBusy(false);
            }
        },
        [appendEvent, ensureAudioRuntime, seekOffsetSeconds, syncSnapshot],
    );

    const handleStop = useCallback(
        async function handleStop() {
            const session = sessionRef.current;
            if (!session) return;

            setIsBusy(true);
            setErrorMessage(null);

            try {
                await session.stop();
                appendEvent("stopped playback session");
                syncSnapshot();
            } finally {
                setIsBusy(false);
            }
        },
        [appendEvent, syncSnapshot],
    );

    const handleInvalidTrack = useCallback(
        async function handleInvalidTrack() {
            const session = await ensureAudioRuntime();
            if (!session) return;

            setIsBusy(true);
            setErrorMessage(null);

            try {
                const result = await session.playTrack(999999999, 0);
                if (!result) {
                    appendEvent(
                        "invalid track request failed closed as expected",
                    );
                }
                syncSnapshot();
            } finally {
                setIsBusy(false);
            }
        },
        [appendEvent, ensureAudioRuntime, syncSnapshot],
    );

    const handleSeekSpam = useCallback(
        async function handleSeekSpam() {
            const session = await ensureAudioRuntime();
            if (!session) return;

            const baseOffset = seekOffsetSeconds ?? 0;
            const runId = ++seekSpamRunRef.current;
            appendEvent("running seek stress sequence");

            for (const [index, delay] of SEEK_SPAM_DELAYS_MS.entries()) {
                window.setTimeout(() => {
                    if (runId !== seekSpamRunRef.current) return;

                    void session.seek(baseOffset + index * 1.25).then(() => {
                        if (runId !== seekSpamRunRef.current) return;
                        syncSnapshot();
                    });
                }, delay);
            }
        },
        [appendEvent, ensureAudioRuntime, seekOffsetSeconds, syncSnapshot],
    );

    const handleReinitialize = useCallback(
        async function handleReinitialize() {
            setIsBusy(true);
            setErrorMessage(null);

            try {
                await destroyAudioRuntime();
                appendEvent("destroyed audio runtime");
                await ensureAudioRuntime();
                syncSnapshot();
            } finally {
                setIsBusy(false);
            }
        },
        [appendEvent, destroyAudioRuntime, ensureAudioRuntime, syncSnapshot],
    );

    useEffect(
        function pollSnapshotEffect() {
            const intervalId = window.setInterval(() => {
                syncSnapshot();
            }, SNAPSHOT_INTERVAL_MS);

            return () => {
                window.clearInterval(intervalId);
            };
        },
        [syncSnapshot],
    );

    useEffect(
        function loadTrackSummaryEffect() {
            let cancelled = false;

            async function loadTrackSummary() {
                if (selectedTrackId === null) {
                    setTrackSummary(null);
                    return;
                }

                const result = await electron.invoke("library:getTracks", [
                    selectedTrackId,
                ]);
                if (cancelled) return;

                const track = result.tracks[0];
                if (!track) {
                    setTrackSummary(null);
                    return;
                }

                setTrackSummary(toTrackSummary(track));
            }

            void loadTrackSummary();

            return () => {
                cancelled = true;
            };
        },
        [selectedTrackId],
    );

    useEffect(
        function cleanupEffect() {
            return () => {
                void destroyAudioRuntime();
            };
        },
        [destroyAudioRuntime],
    );

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field name="trackId">
                    <FieldLabel>Track ID</FieldLabel>
                    <TextInput
                        value={trackIdInput}
                        onChange={(event) =>
                            setTrackIdInput(event.target.value)
                        }
                    />
                    <FieldDescription>
                        Enter a library track id to drive the low-level playback
                        session.
                    </FieldDescription>
                </Field>

                <Field name="outputDevice">
                    <FieldLabel>Output Device</FieldLabel>
                    <Select
                        value={selectedOutputDeviceId}
                        disabled={isLoading}
                        onValueChange={(value) => {
                            if (value === null) return;

                            setSelectedOutputDeviceId(value);
                            void applyOutputDevice(value);
                        }}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="System default" />
                        </SelectTrigger>
                        <SelectContent align="start">
                            <SelectItem value="default">
                                System default
                            </SelectItem>
                            {outputDevices.map((device) => (
                                <SelectItem
                                    key={device.deviceId}
                                    value={device.deviceId}>
                                    {device.label ||
                                        `Unnamed device (${device.deviceId})`}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <FieldDescription>
                        {isLoading
                            ? "Loading output devices..."
                            : outputDeviceError ||
                              "Switch outputs during playback to test sink routing."}
                    </FieldDescription>
                </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field name="playOffset">
                    <FieldLabel>Play Offset (seconds)</FieldLabel>
                    <TextInput
                        value={playOffsetInput}
                        onChange={(event) =>
                            setPlayOffsetInput(event.target.value)
                        }
                    />
                </Field>

                <Field name="seekOffset">
                    <FieldLabel>Seek Offset (seconds)</FieldLabel>
                    <TextInput
                        value={seekOffsetInput}
                        onChange={(event) =>
                            setSeekOffsetInput(event.target.value)
                        }
                    />
                </Field>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    disabled={isInitializing || isBusy}
                    onClick={handlePlay}>
                    Play Track
                </Button>
                <Button
                    disabled={isInitializing || isBusy}
                    onClick={handleSeek}>
                    Seek
                </Button>
                <Button
                    disabled={isInitializing || isBusy}
                    onClick={handleStop}>
                    Stop
                </Button>
                <Button
                    variant="ghost"
                    disabled={isInitializing || isBusy}
                    onClick={handleSeekSpam}>
                    Seek Spam
                </Button>
                <Button
                    variant="ghost"
                    disabled={isInitializing || isBusy}
                    onClick={handleInvalidTrack}>
                    Invalid Track
                </Button>
                <Button
                    variant="ghost"
                    disabled={isInitializing || isBusy}
                    onClick={handleReinitialize}>
                    Reinitialize
                </Button>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <h4 className="mb-3 text-lg font-medium">
                        Session Diagnostics
                    </h4>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <DiagnosticRow label="State" value={snapshot.state} />
                        <DiagnosticRow
                            label="Generation"
                            value={String(snapshot.generation)}
                        />
                        <DiagnosticRow
                            label="Active Track"
                            value={formatNullableNumber(snapshot.activeTrackId)}
                        />
                        <DiagnosticRow
                            label="Pending Track"
                            value={formatNullableNumber(
                                snapshot.pendingTrackId,
                            )}
                        />
                        <DiagnosticRow
                            label="Transport Frame"
                            value={snapshot.transportFrame.toLocaleString()}
                        />
                        <DiagnosticRow
                            label="Transport Position"
                            value={`${snapshot.transportPositionMilliseconds.toLocaleString()} ms`}
                        />
                        <DiagnosticRow
                            label="Track Position"
                            value={formatNullableMilliseconds(
                                snapshot.trackPositionMilliseconds,
                            )}
                        />
                        <DiagnosticRow
                            label="Starvation Count"
                            value={snapshot.starvationCount.toLocaleString()}
                        />
                        <DiagnosticRow
                            label="Server Port"
                            value={formatNullableNumber(serverPort)}
                        />
                        <DiagnosticRow
                            label="Runtime"
                            value={
                                engineRef.current ? "ready" : "not initialized"
                            }
                        />
                    </div>

                    {(trackSummary || errorMessage) && (
                        <div className="mt-4 flex flex-col gap-2 border-t border-neutral-200/80 pt-4 dark:border-neutral-800">
                            {trackSummary ? (
                                <div className="rounded-xl bg-white/70 p-3 text-sm dark:bg-neutral-900/60">
                                    <div className="font-medium">
                                        {trackSummary.title}
                                    </div>
                                    <div className="opacity-70">
                                        {trackSummary.artist} -{" "}
                                        {trackSummary.album}
                                    </div>
                                    <div className="mt-1 text-xs opacity-60">
                                        Track {String(trackSummary.id)}
                                        {trackSummary.durationMs !== null
                                            ? ` - ${trackSummary.durationMs.toLocaleString()} ms`
                                            : ""}
                                    </div>
                                </div>
                            ) : null}

                            {errorMessage ? (
                                <div className="rounded-xl border border-red-300/70 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/70 dark:bg-red-950/40 dark:text-red-300">
                                    {errorMessage}
                                </div>
                            ) : null}
                        </div>
                    )}
                </section>

                <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/40">
                    <h4 className="mb-3 text-lg font-medium">Event Log</h4>
                    <div className="flex max-h-72 flex-col gap-2 overflow-y-auto text-sm">
                        {eventLog.length === 0 ? (
                            <div className="opacity-60">No events yet.</div>
                        ) : (
                            eventLog.map((entry) => (
                                <div
                                    key={entry}
                                    className={clsx(
                                        "rounded-xl border border-neutral-200/80 bg-white/80 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-900/70",
                                    )}>
                                    {entry}
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}

function DiagnosticRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-xl bg-white/70 px-3 py-2 dark:bg-neutral-900/60">
            <div className="text-xs opacity-60">{label}</div>
            <div className="text-sm font-medium">{value}</div>
        </div>
    );
}

function parseInteger(value: string): number | null {
    if (value.trim() === "") return null;

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}

function parseNumber(value: string): number | null {
    if (value.trim() === "") return null;

    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return null;
    return parsed;
}

function toTrackSummary(track: TrackResult): TrackSummary {
    return {
        id: track.track.id,
        title: track.track.title,
        artist: track.artist.name,
        album: track.album.title,
        durationMs: track.track.duration,
    };
}

function formatNullableNumber(value: number | null): string {
    return value === null ? "-" : value.toLocaleString();
}

function formatNullableMilliseconds(value: number | null): string {
    return value === null ? "-" : `${value.toLocaleString()} ms`;
}
