import type { SourceType } from "@shared/constants/sources";

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
import { useDialog } from "@renderer/hooks/useDialog";
import { SOURCE_TYPES } from "@shared/constants/sources";
import { useState } from "react";

export default function AddSourceView() {
    const { openDialog } = useDialog();
    const [sourceType, setSourceType] = useState<SourceType>(
        SOURCE_TYPES.LOCAL,
    );
    const [displayName, setDisplayName] = useState("");
    const [uri, setUri] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sourceTypeItems = [
        { label: "Local", value: SOURCE_TYPES.LOCAL },
    ] as const;

    const handleAdd = async () => {
        if (!uri.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await electron.invoke(
                "library:addSource",
                uri.trim(),
                sourceType,
                displayName.trim() || undefined,
            );

            if (!result) {
                setIsSubmitting(false);
                await openDialog({
                    type: "error",
                    title: "Error",
                    description: "A source with this URI already exists",
                    id: "add-source-error",
                });
                return;
            }

            setUri("");
            setDisplayName("");
            setIsSubmitting(false);
            window.close();
        } catch (err) {
            setIsSubmitting(false);
            await openDialog({
                type: "error",
                title: "Error",
                description:
                    err instanceof Error ? err.message : "Failed to add source",
                id: "add-source-error",
            });
        }
    };

    return (
        <SettingsCategory title="Add media source">
            <div className="flex flex-row items-center justify-between gap-8">
                <div>
                    <h2>Source type</h2>
                    <p className="text-sm opacity-50">
                        Pick where the source will be added from
                    </p>
                </div>
                <Select
                    disabled
                    items={sourceTypeItems}
                    value={sourceType}
                    onValueChange={(newValue) => {
                        if (newValue) setSourceType(newValue as SourceType);
                    }}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {sourceTypeItems.map((item) => (
                            <SelectItem key={item.value} value={item.value}>
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Field name="displayName">
                <FieldLabel>
                    Display name
                    <span className="px-1.5 opacity-40">optional</span>
                </FieldLabel>
                <TextInput
                    placeholder="Music"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                    }}
                />
            </Field>
            <Field name="uri">
                <FieldLabel>URI</FieldLabel>
                <TextInput
                    required
                    placeholder="C:/Users/..."
                    value={uri}
                    onChange={(e) => setUri(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleAdd();
                    }}
                />
                <FieldError>
                    An URI path pointing to the source is required
                </FieldError>
            </Field>
            <div className="flex flex-1 items-end justify-end gap-4">
                <Button
                    onClick={handleAdd}
                    disabled={!uri.trim() || isSubmitting}>
                    {isSubmitting ? "Adding..." : "Add"}
                </Button>
            </div>
        </SettingsCategory>
    );
}
