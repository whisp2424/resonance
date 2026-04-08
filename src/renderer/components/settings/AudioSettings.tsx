import type { AudioOutputDevice } from "@shared/schema/settings";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { SettingsRow } from "@renderer/components/settings/SettingsRow";
import { SettingsSection } from "@renderer/components/settings/SettingsSection";
import { SettingsSelectField } from "@renderer/components/settings/SettingsSelectField";
import Button from "@renderer/components/ui/Button";
import { Switch } from "@renderer/components/ui/Switch";
import { useSetting } from "@renderer/hooks/settings/useSetting";
import { usePlaybackStore } from "@renderer/lib/audio/state/playbackStore";
import { DEFAULT_SETTINGS } from "@shared/schema/settings";

const outputNotifyChangesItems = [
    { label: "None", value: "none" },
    { label: "On startup", value: "startup" },
    { label: "Always", value: "always" },
] as const;

const onDisconnectRoutingItems = [
    { label: "Switch to system default", value: "switch_to_default" },
    { label: "Keep preferred device", value: "keep_preferred" },
] as const;

function outputNotifyChangesDescription(
    notifyChanges:
        | (typeof outputNotifyChangesItems)[number]["value"]
        | undefined,
): string {
    switch (notifyChanges) {
        case "startup":
            return "You will be notified if your output device has changed since the last time when the app starts";
        case "always":
            return "You will always be notified when the current output device changes";
        case "none":
        default:
            return "You will not receive device change notifications";
    }
}

function buildAudioDeviceItems(
    outputDevices: MediaDeviceInfo[],
    knownDevices: AudioOutputDevice[],
): Array<{ label: string; value: string }> {
    const defaultDevice = outputDevices.find(
        (device) => device.deviceId === "default",
    );

    const connectedDevices = outputDevices
        .filter((device) => device.deviceId !== "default")
        .map((device) => ({
            label: device.label || "Unknown device",
            value: device.deviceId,
        }));

    const connectedDeviceIds = new Set(
        connectedDevices.map((device) => device.value),
    );

    const disconnectedKnownDevices = knownDevices
        .filter((device) => !connectedDeviceIds.has(device.id))
        .map((device) => ({
            label: `${device.label} (Disconnected)`,
            value: device.id,
        }));

    return [
        {
            label: defaultDevice?.label || "System default",
            value: "default",
        },
        ...connectedDevices,
        ...disconnectedKnownDevices,
    ];
}

export function AudioSettings() {
    const [outputDeviceId, setOutputDeviceId] = useSetting(
        "audio.output.deviceId",
    );

    const [outputNotifyChanges, setOutputNotifyChanges] = useSetting(
        "audio.output.notifyChanges",
    );

    const [pauseOnDisconnect, setPauseOnDisconnect] = useSetting(
        "audio.output.pauseOnDisconnect",
    );
    const [resumeOnReconnect, setResumeOnReconnect] = useSetting(
        "audio.output.resumeOnReconnect",
    );

    const [onDisconnectRouting, setOnDisconnectRouting] = useSetting(
        "audio.output.onDisconnectRouting",
    );

    const [knownDevices] = useSetting("audio.output.knownDevices");

    const outputDevices = usePlaybackStore((state) => state.outputDevices);
    const audioDeviceItems = buildAudioDeviceItems(
        outputDevices,
        knownDevices ?? DEFAULT_SETTINGS.audio.output.knownDevices,
    );
    const selectedOutputDeviceId = audioDeviceItems.some(
        (device) => device.value === outputDeviceId,
    )
        ? outputDeviceId
        : "default";
    const showsDisconnectOptions = outputDeviceId !== "default";

    return (
        <SettingsCategory title="Audio">
            <SettingsRow
                title="Audio information"
                description="Inspect audio processing and decoding details">
                <Button
                    onClick={() => {
                        electron.invoke(
                            "window:new",
                            "/audio-info",
                            "audioInfo",
                        );
                    }}>
                    Open
                </Button>
            </SettingsRow>
            <SettingsSection title="Device settings" className="mt-4">
                <SettingsSelectField
                    title="Audio device"
                    description="Choose the output device"
                    items={audioDeviceItems}
                    value={selectedOutputDeviceId}
                    layout="stacked"
                    placeholder="System default"
                    onValueChange={(newValue) => {
                        setOutputDeviceId(newValue);
                    }}
                />

                {showsDisconnectOptions && (
                    <>
                        <SettingsSelectField
                            title="Device disconnection behavior"
                            description="Choose what happens when the selected output device is disconnected"
                            items={onDisconnectRoutingItems}
                            value={onDisconnectRouting}
                            onValueChange={(newValue) => {
                                setOnDisconnectRouting(newValue);
                            }}
                        />

                        <SettingsRow
                            title="Pause when device disconnects"
                            description="If enabled, playback will be paused after the current audio device is disconnected">
                            <Switch
                                checked={pauseOnDisconnect ?? false}
                                onCheckedChange={(checked) => {
                                    setPauseOnDisconnect(checked);
                                }}
                            />
                        </SettingsRow>

                        <SettingsRow
                            title="Resume when device reconnects"
                            description="If enabled, playback will continue once the previously disconnected device is reconnected">
                            <Switch
                                checked={resumeOnReconnect ?? false}
                                onCheckedChange={(checked) => {
                                    setResumeOnReconnect(checked);
                                }}
                            />
                        </SettingsRow>
                    </>
                )}

                <SettingsSelectField
                    title="Device change notifications"
                    description={outputNotifyChangesDescription(
                        outputNotifyChanges,
                    )}
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
