import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import { useSetting } from "@renderer/hooks/settings/useSetting";
import { usePlaybackStore } from "@renderer/lib/audio/state/playbackStore";
import { useMemo } from "react";

const outputNotifyChangesItems = [
    { label: "None", value: "none" },
    { label: "On startup", value: "startup" },
    { label: "Always", value: "always" },
] as const;

function getDeviceLabel(device: MediaDeviceInfo): string {
    return device.label || `Unnamed device (${device.deviceId})`;
}

export function AudioSettings() {
    const [outputDeviceId, setOutputDeviceId] = useSetting(
        "audio.output.deviceId",
    );

    const [outputNotifyChanges, setOutputNotifyChanges] = useSetting(
        "audio.output.notifyChanges",
    );
    const outputDevices = usePlaybackStore((state) => state.outputDevices);

    const audioDeviceItems = useMemo(() => {
        const defaultDevice = outputDevices.find(
            (device) => device.deviceId === "default",
        );

        return [
            {
                label: defaultDevice
                    ? getDeviceLabel(defaultDevice)
                    : "System default",
                value: "default",
            },
            ...outputDevices
                .filter((device) => device.deviceId !== "default")
                .map((device) => ({
                    label: getDeviceLabel(device),
                    value: device.deviceId,
                })),
        ];
    }, [outputDevices]);

    return (
        <SettingsCategory title="Audio">
            <div className="flex flex-row items-center justify-between gap-8">
                <div>
                    <div>Audio information</div>
                    <p className="text-sm opacity-50">
                        Inspect audio processing and decoding details
                    </p>
                </div>
                <Button>Open</Button>
            </div>
            <div className="flex flex-1 flex-col gap-6">
                <h2 className="mt-4 text-xl font-light opacity-60">
                    Device settings
                </h2>
                <div className="flex flex-col gap-3">
                    <div>
                        <div>Audio device</div>
                        <p className="text-sm opacity-50">
                            Select the primary audio device to be used for audio
                            output
                        </p>
                    </div>
                    <Select
                        items={audioDeviceItems}
                        value={outputDeviceId ?? "default"}
                        onValueChange={(newValue) => {
                            if (newValue === null) return;
                            setOutputDeviceId(newValue);
                            usePlaybackStore
                                .getState()
                                .setOutputDevice(newValue);
                        }}>
                        <SelectTrigger>
                            <SelectValue placeholder="System default" />
                        </SelectTrigger>
                        <SelectContent>
                            {audioDeviceItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex flex-row items-center justify-between gap-8">
                    <div>
                        <div>Device change notifications</div>
                        <p className="text-sm opacity-50">
                            Notify me when the audio device has changed
                        </p>
                    </div>
                    <Select
                        items={outputNotifyChangesItems}
                        value={outputNotifyChanges ?? "none"}
                        onValueChange={(newValue) => {
                            if (newValue === null) return;
                            setOutputNotifyChanges(newValue);
                        }}>
                        <SelectTrigger className="min-w-32">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {outputNotifyChangesItems.map((item) => (
                                <SelectItem key={item.value} value={item.value}>
                                    {item.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </SettingsCategory>
    );
}
