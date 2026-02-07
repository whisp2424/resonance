import type { MediaBackend } from "@shared/constants/mediaBackends";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@renderer/components/ui/Field";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import TextInput from "@renderer/components/ui/TextInput";
import { useAddSource } from "@renderer/hooks/library/useSources";
import { useDialog } from "@renderer/hooks/useDialog";
import { MEDIA_BACKENDS } from "@shared/constants/mediaBackends";
import { useState } from "react";

export default function AddSourceView() {
    const addSource = useAddSource();
    const { openDialog } = useDialog();
    const [sourceBackend, setSourceBackend] = useState<MediaBackend>(
        MEDIA_BACKENDS.LOCAL,
    );

    const [displayName, setDisplayName] = useState("");
    const [uri, setUri] = useState("");

    const sourceBackendItems = [
        { label: "Local", value: MEDIA_BACKENDS.LOCAL },
    ] as const;

    const handleAdd = async () => {
        if (!uri.trim()) return;

        const result = await addSource.mutateAsync({
            uri: uri.trim(),
            backend: sourceBackend,
            name: displayName.trim() || undefined,
        });

        if (result.success) {
            window.close();
            return;
        }

        switch (result.error) {
            case "duplicate":
                await openDialog({
                    type: "warning",
                    title: "Source already exists",
                    description:
                        result.message ||
                        "This media source has already been added to your library",
                    id: "warning:duplicate-source",
                });
                break;
            case "invalid":
                await openDialog({
                    type: "error",
                    title: "Invalid source provided",
                    description:
                        result.message ||
                        "The location provided is not valid for the selected media backend, ensure it is correct and try again",
                    id: "error:invalid-source",
                });
                break;
            case "unknown":
            default:
                await openDialog({
                    type: "error",
                    title: "An error occurred trying to add the source",
                    description:
                        result.message ||
                        "An unexpected error occurred. Please try again",
                    id: "error:add-source",
                });
        }
    };

    return (
        <SettingsCategory title="Add media source">
            <div className="flex flex-row items-center justify-between gap-8">
                <div>
                    <h2>Media backend</h2>
                    <p className="text-sm opacity-50">
                        Pick a media backend to use for this source
                    </p>
                </div>
                <Select
                    disabled
                    items={sourceBackendItems}
                    value={sourceBackend}
                    onValueChange={(newValue) => {
                        if (newValue)
                            setSourceBackend(newValue as MediaBackend);
                    }}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {sourceBackendItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Field name="displayName">
                <FieldLabel>
                    Name
                    <span className="px-1.5 opacity-40">(optional)</span>
                </FieldLabel>
                <TextInput
                    placeholder="My music library"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                    }}
                />
            </Field>
            <Field name="uri">
                <FieldLabel>Location</FieldLabel>
                <div className="flex flex-row gap-2">
                    <TextInput
                        required
                        className="flex-1"
                        placeholder="/home/user/Music"
                        value={uri}
                        onChange={(e) => setUri(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                        }}
                    />
                    <Button
                        onClick={async () => {
                            const folder =
                                await electron.invoke("dialog:pickFolder");
                            if (folder) setUri(folder);
                        }}>
                        Browse
                    </Button>
                </div>
                <FieldError>
                    A location pointing to the source is required
                </FieldError>
            </Field>
            <div className="flex flex-1 items-end justify-between">
                <Button onClick={() => window.close()}>Cancel</Button>
                <Button
                    onClick={handleAdd}
                    disabled={!uri.trim() || addSource.isPending}>
                    Add
                </Button>
            </div>
        </SettingsCategory>
    );
}
