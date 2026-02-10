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
import { useShortcut } from "@renderer/hooks/useShortcut";
import { useState } from "react";

export default function AddSourceView() {
    const addSource = useAddSource();
    const { openDialog, pickFolder } = useDialog();
    const [sourceBackend, setSourceBackend] = useState<string>("local");

    const [displayName, setDisplayName] = useState("");
    const [uri, setUri] = useState("");

    const sourceBackendItems = [{ label: "Local", value: "local" }] as const;

    useShortcut({ code: "Escape" }, () => window.close());

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
                        "This media source has already been added to your library.",
                    id: "warning:duplicate-source",
                });
                break;
            case "invalid":
                await openDialog({
                    type: "error",
                    title: "Invalid source provided",
                    description:
                        result.message ||
                        "The location provided is not valid for the selected media backend, ensure it is correct and try again.",
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
                        "An unexpected error occurred. Please try again.",
                    id: "error:add-source",
                });
        }
    };

    return (
        <div className="mt-(--spacing-titlebar-height) flex flex-1 flex-col justify-between gap-8 overflow-y-scroll px-12 pb-8">
            <h1 className="text-4xl font-light">New media source</h1>
            <div className="flex flex-row items-center justify-between gap-8">
                <div>
                    <h2>Media backend</h2>
                    <p className="text-sm opacity-50">
                        The backend you choose determines how media is imported,
                        scanned, and played.
                    </p>
                </div>
                <Select
                    disabled
                    items={sourceBackendItems}
                    value={sourceBackend}
                    onValueChange={(newValue) => {
                        if (newValue) setSourceBackend(newValue);
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
            <div className="flex flex-1 gap-4">
                <Field name="displayName" className="flex-2">
                    <FieldLabel>
                        Display name
                        <span className="px-1.5 opacity-40">(optional)</span>
                    </FieldLabel>
                    <TextInput
                        placeholder="my music library!"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAdd();
                        }}
                    />
                </Field>
                <Field name="uri" className="flex-3">
                    <FieldLabel>Location</FieldLabel>
                    <div className="flex flex-row gap-2">
                        <TextInput
                            required
                            placeholder="/home/user/Music"
                            value={uri}
                            onChange={(e) => setUri(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleAdd();
                            }}
                        />
                        <Button
                            onClick={async () => {
                                const folder = await pickFolder();
                                if (folder) setUri(folder);
                            }}>
                            Browse
                        </Button>
                    </div>
                    <FieldError>
                        A location pointing to the source is required
                    </FieldError>
                </Field>
            </div>
            <div className="flex flex-1 flex-row items-end justify-end gap-2">
                <Button onClick={() => window.close()}>Cancel</Button>
                <Button
                    variant="primary"
                    onClick={handleAdd}
                    disabled={!uri.trim() || addSource.isPending}>
                    Add
                </Button>
            </div>
        </div>
    );
}
