import Button from "@renderer/components/ui/Button";
import { Field, FieldLabel } from "@renderer/components/ui/Field";
import NumberInput from "@renderer/components/ui/NumberInput";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import { useSetting } from "@renderer/hooks/settings/useSetting";
import { AudioServerClient } from "@renderer/lib/audio/AudioServerClient";
import { AudioEngine } from "@renderer/lib/audio/engine/AudioEngine";
import { StagingBuffer } from "@renderer/lib/audio/engine/StagingBuffer";
import processorPath from "@renderer/lib/audio/engine/audioProcessor?worker&url";
import { AudioStream } from "@renderer/lib/audio/stream/AudioStream";
import { useAudioStore } from "@renderer/lib/state/audioStore";
import { useCallback, useEffect, useRef, useState } from "react";

type Status =
    | { type: "idle" }
    | { type: "playing" }
    | { type: "paused" }
    | { type: "error"; message: string };

export default function AudioTesting() {
    const [trackAId, setTrackAId] = useState<number>(1);
    const [trackBId, setTrackBId] = useState<number>(2);
    const [status, setStatus] = useState<Status>({ type: "idle" });
    const [deviceId, setDeviceId] = useSetting("audio.output.deviceId");
    const [isClientReady, setIsClientReady] = useState(false);

    const engineRef = useRef<AudioEngine | null>(null);
    const streamRef = useRef<AudioStream | null>(null);
    const stagingRef = useRef<StagingBuffer | null>(null);
    const clientRef = useRef<AudioServerClient | null>(null);

    const devices = useAudioStore((state) => state.outputDevices);

    useEffect(() => {
        electron.invoke("server:getPort").then(
            (port) => {
                clientRef.current = new AudioServerClient(port);
                setIsClientReady(true);
            },
            (err) => {
                setStatus({
                    type: "error",
                    message: `Failed to connect to audio server: ${String(err)}`,
                });
            },
        );
    }, []);

    const handleDeviceChange = useCallback(
        async (id: string | null) => {
            const selected = id ?? "default";
            await setDeviceId(selected);
            if (engineRef.current) {
                try {
                    await engineRef.current.setOutputDevice(selected);
                } catch (err) {
                    setStatus({
                        type: "error",
                        message: `Failed to switch output device: ${String(err)}`,
                    });
                }
            }
        },
        [setDeviceId],
    );

    const stop = useCallback(async () => {
        streamRef.current?.abort();
        streamRef.current = null;

        stagingRef.current?.abort();
        stagingRef.current = null;

        await engineRef.current?.destroy();
        engineRef.current = null;

        setStatus({ type: "idle" });
    }, []);

    const initEngine = useCallback(async () => {
        const engine = new AudioEngine(processorPath, {
            onStarvation: () => {},
        });

        await engine.init();

        if (deviceId && deviceId !== "default") {
            try {
                await engine.setOutputDevice(deviceId);
            } catch (err) {
                await engine.destroy();
                throw new Error(`Failed to set output device: ${String(err)}`, {
                    cause: err,
                });
            }
        }

        return engine;
    }, [deviceId]);

    const startBasicPlayback = useCallback(async () => {
        await stop();

        let engine: AudioEngine;
        try {
            engine = await initEngine();
        } catch (err) {
            setStatus({ type: "error", message: String(err) });
            return;
        }

        engineRef.current = engine;

        const stream = new AudioStream(engine.buffer!, {
            onWriteEnd: () => null,
            onError: () =>
                setStatus({ type: "error", message: "Stream failed to open" }),
        });

        streamRef.current = stream;
        stream.start(
            clientRef.current!.track(trackAId, {
                sampleRate: engine.buffer!.sampleRate,
            }),
        );

        await engine.play();
        setStatus({ type: "playing" });
    }, [trackAId, stop, initEngine]);

    const startGaplessTest = useCallback(async () => {
        await stop();

        let engine: AudioEngine;
        try {
            engine = await initEngine();
        } catch (err) {
            setStatus({ type: "error", message: String(err) });
            return;
        }

        engineRef.current = engine;

        const sampleRate = engine.buffer!.sampleRate;
        const client = clientRef.current!;

        const staging = new StagingBuffer(sampleRate);
        stagingRef.current = staging;
        staging.load(client.track(trackBId, { sampleRate }));

        const stream = new AudioStream(engine.buffer!, {
            onWriteEnd: () => {
                if (!staging.data.isComplete) return null;
                return {
                    stagingData: staging.data,
                    nextTrackUrl: client.track(trackBId, {
                        sampleRate,
                        offset: staging.data.totalSamples / sampleRate,
                    }),
                };
            },
            onError: () =>
                setStatus({ type: "error", message: "Stream failed to open" }),
        });

        streamRef.current = stream;
        stream.start(client.track(trackAId, { sampleRate }));

        await engine.play();
        setStatus({ type: "playing" });
    }, [trackAId, trackBId, stop, initEngine]);

    const togglePause = useCallback(async () => {
        if (!engineRef.current) return;
        if (status.type === "playing") {
            await engineRef.current.pause();
            setStatus({ type: "paused" });
        } else if (status.type === "paused") {
            await engineRef.current.play();
            setStatus({ type: "playing" });
        }
    }, [status.type]);

    const isActive = status.type === "playing" || status.type === "paused";

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field name="trackAId">
                    <FieldLabel>Track A ID</FieldLabel>
                    <NumberInput
                        value={trackAId}
                        min={1}
                        format={{ useGrouping: false }}
                        onValueChange={(value) => setTrackAId(value ?? 1)}
                    />
                </Field>

                <Field name="trackBId">
                    <FieldLabel>Track B ID</FieldLabel>
                    <NumberInput
                        value={trackBId}
                        min={1}
                        format={{ useGrouping: false }}
                        onValueChange={(value) => setTrackBId(value ?? 1)}
                    />
                </Field>
            </div>

            <Field name="outputDevice">
                <FieldLabel>Output Device</FieldLabel>
                {deviceId !== undefined && (
                    <Select
                        key={devices.map((d) => d.deviceId).join(",")}
                        items={devices.map((d) => ({
                            label: d.label || d.deviceId,
                            value: d.deviceId,
                        }))}
                        value={deviceId}
                        onValueChange={handleDeviceChange}>
                        <SelectTrigger>
                            <SelectValue>
                                {devices.find((d) => d.deviceId === deviceId)
                                    ?.label ?? "Default"}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent className="min-w-80">
                            {devices.map((device) => (
                                <SelectItem
                                    key={device.deviceId}
                                    value={device.deviceId}>
                                    {device.label || device.deviceId}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
            </Field>

            {status.type === "error" && (
                <p className="text-sm text-red-500">{status.message}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
                {isActive && (
                    <>
                        <Button variant="secondary" onClick={togglePause}>
                            {status.type === "playing" ? "Pause" : "Resume"}
                        </Button>
                        <Button variant="secondary" onClick={stop}>
                            Stop
                        </Button>
                    </>
                )}
                <Button
                    disabled={isActive || !isClientReady}
                    onClick={startBasicPlayback}>
                    Test Basic Playback
                </Button>
                <Button
                    disabled={isActive || !isClientReady}
                    onClick={startGaplessTest}>
                    Test Gapless Handoff
                </Button>
            </div>
        </div>
    );
}
