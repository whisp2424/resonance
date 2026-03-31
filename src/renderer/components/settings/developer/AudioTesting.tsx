import type { QueueEntry } from "@renderer/lib/audio/state/queueStore";

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
import { usePlaybackStore } from "@renderer/lib/audio/state/playbackStore";
import { useQueueStore } from "@renderer/lib/audio/state/queueStore";
import { log } from "@shared/utils/logger";
import clsx from "clsx";
import { useCallback, useRef, useState } from "react";

import IconMoveDown from "~icons/lucide/arrow-down-0-1";
import IconMoveUp from "~icons/lucide/arrow-up-0-1";
import IconPause from "~icons/lucide/pause";
import IconPlay from "~icons/lucide/play";
import IconSkipBack from "~icons/lucide/skip-back";
import IconSkipForward from "~icons/lucide/skip-forward";
import IconX from "~icons/lucide/x";

export default function AudioTesting() {
    const { isPlaying, positionMs, volume, outputDevices } = usePlaybackStore();
    const { entries, currentEntryId } = useQueueStore();

    const [trackIdInput, setTrackIdInput] = useState("1");
    const [selectedDeviceId, setSelectedDeviceId] = useState("default");
    const [eventLog, setEventLog] = useState<string[]>([]);

    // Scrubber drag state — while dragging, show the drag position instead of
    // the live playback position so the thumb doesn't jump around.
    const [scrubbing, setScrubbing] = useState(false);
    const [scrubPositionMs, setScrubPositionMs] = useState(0);
    const isScrubbing = useRef(false);

    const appendEvent = useCallback(function appendEvent(message: string) {
        setEventLog((prev) => [message, ...prev].slice(0, 20));
        log(message, "debug:audio", "info");
    }, []);

    const currentIndex = entries.findIndex((e) => e.id === currentEntryId);
    const currentEntry = currentIndex >= 0 ? entries[currentIndex] : null;
    const durationSeconds = currentEntry?.track.track.duration ?? null;
    const durationMs = durationSeconds !== null ? durationSeconds * 1000 : null;

    function formatMs(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${String(minutes)}:${String(seconds).padStart(2, "0")}`;
    }

    async function handleEnqueue() {
        const id = parseTrackId(trackIdInput);
        if (id === null) return;
        await useQueueStore.getState().enqueue([id]);
        appendEvent(`enqueued track ${String(id)}`);
    }

    async function handlePlayNow() {
        const id = parseTrackId(trackIdInput);
        if (id === null) return;
        await useQueueStore.getState().enqueue([id], { playNow: true });
        appendEvent(`playing track ${String(id)} now`);
    }

    async function handlePlayPause() {
        const store = usePlaybackStore.getState();
        if (isPlaying) {
            store.pause();
            appendEvent("paused");
        } else {
            await store.play();
            appendEvent("resumed");
        }
    }

    async function handlePrevious() {
        await useQueueStore.getState().previous();
        appendEvent("previous");
    }

    async function handleNext() {
        await useQueueStore.getState().next();
        appendEvent("next");
    }

    function handleVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
        usePlaybackStore.getState().setVolume(Number(e.target.value));
    }

    async function handleDeviceChange(value: string) {
        setSelectedDeviceId(value);
        const deviceId = value === "default" ? "" : value;
        await usePlaybackStore.getState().setOutputDevice(deviceId);
        appendEvent(`output device: ${value}`);
    }

    async function handleJump(index: number) {
        await useQueueStore.getState().jump(index);
        appendEvent(`jumped to queue index ${String(index)}`);
    }

    async function handleRemove(index: number) {
        await useQueueStore.getState().remove(index);
        appendEvent(`removed queue index ${String(index)}`);
    }

    function handleClearQueue() {
        void useQueueStore.getState().enqueue([], { clearQueue: true });
        appendEvent("cleared queue");
    }

    function handleReorder(from: number, to: number) {
        useQueueStore.getState().reorder(from, to);
        appendEvent(`reordered ${String(from)} → ${String(to)}`);
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Player */}
            <section className="flex flex-col gap-4 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
                {/* Track info */}
                <div className="flex min-h-10 flex-col gap-0.5">
                    {currentEntry ? (
                        <>
                            <div className="truncate text-sm font-medium">
                                {currentEntry.track.track.title}
                            </div>
                            <div className="truncate text-xs opacity-50">
                                {currentEntry.track.artist.name}
                                {" — "}
                                {currentEntry.track.album.title}
                            </div>
                        </>
                    ) : (
                        <div className="text-sm opacity-40">
                            Nothing playing
                        </div>
                    )}
                </div>

                {/* Scrubber */}
                <div className="flex flex-col gap-1">
                    <input
                        type="range"
                        min={0}
                        max={durationMs ?? 100}
                        step={100}
                        value={
                            durationMs === null
                                ? 0
                                : scrubbing
                                  ? scrubPositionMs
                                  : positionMs
                        }
                        disabled={durationMs === null}
                        className="h-1.5 w-full cursor-pointer accent-[var(--color-accent)] disabled:opacity-40"
                        onMouseDown={() => {
                            isScrubbing.current = true;
                            setScrubbing(true);
                            setScrubPositionMs(positionMs);
                        }}
                        onChange={(e) => {
                            if (!isScrubbing.current) return;
                            setScrubPositionMs(Number(e.target.value));
                        }}
                        onMouseUp={(e) => {
                            const target = e.target as HTMLInputElement;
                            const ms = Number(target.value);
                            isScrubbing.current = false;
                            setScrubbing(false);
                            usePlaybackStore.getState().seek(ms);
                            appendEvent(`seek to ${(ms / 1000).toFixed(1)}s`);
                        }}
                    />
                    <div className="flex justify-between text-xs opacity-40">
                        <span>
                            {formatMs(scrubbing ? scrubPositionMs : positionMs)}
                        </span>
                        <span>
                            {durationMs !== null
                                ? formatMs(durationMs)
                                : "--:--"}
                        </span>
                    </div>
                </div>

                {/* Transport controls */}
                <div className="flex items-center justify-center gap-2">
                    <Button
                        variant="ghost"
                        className="size-9 rounded-full p-0"
                        icon={<IconSkipBack />}
                        disabled={currentIndex <= 0 && positionMs < 3000}
                        onClick={handlePrevious}
                    />
                    <Button
                        variant="primary"
                        className="size-10 rounded-full p-0"
                        icon={isPlaying ? <IconPause /> : <IconPlay />}
                        onClick={handlePlayPause}
                    />
                    <Button
                        variant="ghost"
                        className="size-9 rounded-full p-0"
                        icon={<IconSkipForward />}
                        disabled={currentIndex >= entries.length - 1}
                        onClick={handleNext}
                    />
                </div>

                {/* Volume */}
                <div className="flex items-center gap-3">
                    <span className="text-xs opacity-40">Vol</span>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={volume}
                        onChange={handleVolumeChange}
                        className="h-1.5 w-full cursor-pointer accent-[var(--color-accent)]"
                    />
                    <span className="w-8 text-right text-xs opacity-40">
                        {Math.round(volume * 100)}%
                    </span>
                </div>
            </section>

            {/* Queue */}
            <section className="flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">
                        Queue
                        {entries.length > 0 && (
                            <span className="ml-2 opacity-40">
                                {entries.length}
                            </span>
                        )}
                    </h4>
                    {entries.length > 0 && (
                        <Button
                            variant="ghost"
                            className="h-7 px-2 text-xs"
                            onClick={handleClearQueue}>
                            Clear
                        </Button>
                    )}
                </div>

                {entries.length === 0 ? (
                    <div className="py-4 text-center text-sm opacity-40">
                        Queue is empty
                    </div>
                ) : (
                    <div className="flex flex-col gap-1">
                        {entries.map((entry: QueueEntry, index: number) => (
                            <QueueRow
                                key={entry.id}
                                entry={entry}
                                index={index}
                                isCurrent={entry.id === currentEntryId}
                                isFirst={index === 0}
                                isLast={index === entries.length - 1}
                                onJump={handleJump}
                                onRemove={handleRemove}
                                onReorder={handleReorder}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Controls */}
            <Field name="enqueue">
                <FieldLabel>Track ID</FieldLabel>
                <div className="flex gap-2">
                    <TextInput
                        value={trackIdInput}
                        onChange={(e) => setTrackIdInput(e.target.value)}
                        placeholder="1"
                    />
                    <Button onClick={handleEnqueue}>Enqueue</Button>
                    <Button variant="primary" onClick={handlePlayNow}>
                        Play Now
                    </Button>
                </div>
                <FieldDescription>
                    Add a track ID to the queue.
                </FieldDescription>
            </Field>

            <Field name="outputDevice">
                <FieldLabel>Output Device</FieldLabel>
                <Select
                    value={selectedDeviceId}
                    disabled={outputDevices.length === 0}
                    onValueChange={(value) => {
                        if (value === null) return;
                        void handleDeviceChange(value);
                    }}>
                    <SelectTrigger className="w-full">
                        <SelectValue placeholder="System default" />
                    </SelectTrigger>
                    <SelectContent align="start">
                        <SelectItem value="default">System default</SelectItem>
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
                    {outputDevices.length === 0
                        ? "Loading output devices..."
                        : "Switch outputs during playback to test sink routing."}
                </FieldDescription>
            </Field>

            {/* Event log */}
            <section className="rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-5 dark:border-neutral-800 dark:bg-neutral-950/40">
                <h4 className="mb-3 text-sm font-medium">Event Log</h4>
                <div className="flex max-h-48 flex-col gap-1.5 overflow-y-auto">
                    {eventLog.length === 0 ? (
                        <div className="text-sm opacity-40">No events yet.</div>
                    ) : (
                        eventLog.map((entry, i) => (
                            <div
                                key={i}
                                className="rounded-lg border border-neutral-200/80 bg-white/80 px-3 py-1.5 font-mono text-xs dark:border-neutral-800 dark:bg-neutral-900/70">
                                {entry}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}

interface QueueRowProps {
    entry: QueueEntry;
    index: number;
    isCurrent: boolean;
    isFirst: boolean;
    isLast: boolean;
    onJump: (index: number) => void;
    onRemove: (index: number) => void;
    onReorder: (from: number, to: number) => void;
}

function QueueRow({
    entry,
    index,
    isCurrent,
    isFirst,
    isLast,
    onJump,
    onRemove,
    onReorder,
}: QueueRowProps) {
    return (
        <div
            className={clsx(
                "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors",
                isCurrent
                    ? "bg-[color-mix(in_oklab,var(--color-accent)_10%,transparent)] text-[var(--color-accent)]"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-800/60",
            )}>
            <div className="flex shrink-0 flex-col gap-0.5">
                <button
                    className={clsx(
                        "rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-40 hover:opacity-100 disabled:pointer-events-none disabled:opacity-0",
                    )}
                    disabled={isFirst}
                    onClick={() => onReorder(index, index - 1)}>
                    <IconMoveUp className="size-3.5" />
                </button>
                <button
                    className={clsx(
                        "rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-40 hover:opacity-100 disabled:pointer-events-none disabled:opacity-0",
                    )}
                    disabled={isLast}
                    onClick={() => onReorder(index, index + 1)}>
                    <IconMoveDown className="size-3.5" />
                </button>
            </div>
            <button
                className="flex min-w-0 flex-1 flex-col gap-0.5 text-left"
                onClick={() => onJump(index)}>
                <span className="truncate leading-tight font-medium">
                    {entry.track.track.title}
                </span>
                <span
                    className={clsx(
                        "truncate text-xs leading-tight",
                        isCurrent ? "opacity-70" : "opacity-40",
                    )}>
                    {entry.track.artist.name}
                </span>
            </button>
            <button
                className="shrink-0 rounded-md p-1 opacity-0 transition-opacity group-hover:opacity-40 hover:opacity-100"
                onClick={() => onRemove(index)}>
                <IconX className="size-3.5" />
            </button>
        </div>
    );
}

function parseTrackId(value: string): number | null {
    const parsed = Number(value.trim());
    if (!Number.isInteger(parsed) || parsed <= 0) return null;
    return parsed;
}
