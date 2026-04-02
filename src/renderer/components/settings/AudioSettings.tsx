import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { Timeline } from "@renderer/components/ui/Timeline";

import IconWaveform from "~icons/lucide/audio-waveform";
import IconAudioFile from "~icons/lucide/file-headphone";
import IconMonitorSpeaker from "~icons/lucide/monitor-speaker";
import IconVolume from "~icons/lucide/volume-2";

const steps = [
    {
        icon: IconAudioFile,
        label: "Source",
    },
    {
        icon: IconMonitorSpeaker,
        label: "Audio server",
    },
    {
        icon: IconWaveform,
        label: "DSP",
    },
    {
        icon: IconVolume,
        label: "Output device",
    },
];

export function AudioSettings() {
    return (
        <SettingsCategory title="Audio">
            <div className="flex flex-col gap-8">
                <Timeline steps={steps} />
            </div>
        </SettingsCategory>
    );
}
