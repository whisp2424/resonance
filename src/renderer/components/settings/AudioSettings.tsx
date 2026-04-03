import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { SettingsRow } from "@renderer/components/settings/SettingsRow";
import { SettingsSection } from "@renderer/components/settings/SettingsSection";
import { SettingsSelectField } from "@renderer/components/settings/SettingsSelectField";
import Button from "@renderer/components/ui/Button";
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
            <SettingsRow
                title="Audio information"
                description="Inspect audio processing and decoding details">
                <Button>Open</Button>
            </SettingsRow>
            <SettingsSection title="Device settings" className="mt-4">
                <SettingsSelectField
                    title="Audio device"
                    description="Select the primary audio device to be used for audio output"
                    items={audioDeviceItems}
                    value={outputDeviceId}
                    layout="stacked"
                    placeholder="System default"
                    onValueChange={(newValue) => {
                        setOutputDeviceId(newValue);
                        usePlaybackStore.getState().setOutputDevice(newValue);
                    }}
                />

                <SettingsSelectField
                    title="Device change notifications"
                    description="Notify me when the audio device has changed"
                    items={outputNotifyChangesItems}
                    value={outputNotifyChanges}
                    onValueChange={(newValue) => {
                        setOutputNotifyChanges(newValue);
                    }}
                />
            </SettingsSection>
        </SettingsCategory>
    );
}
