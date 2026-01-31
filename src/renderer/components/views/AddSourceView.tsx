import type { SourceType } from "@shared/constants/sources";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import { Field, FieldError, FieldLabel } from "@renderer/components/ui/Field";
import Input from "@renderer/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import { SOURCE_TYPES } from "@shared/constants/sources";
import { useState } from "react";

export default function AddSourceView() {
    const [sourceType, setSourceType] = useState<SourceType>(
        SOURCE_TYPES.LOCAL,
    );
    const [displayName, setDisplayName] = useState("");
    const [uri, setUri] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sourceTypeItems = [
        { label: "Local", value: SOURCE_TYPES.LOCAL },
    ] as const;

    const handleAdd = async () => {
        if (!uri.trim()) return;

        setIsSubmitting(true);
        setError(null);
        try {
            const result = await electron.invoke(
                "library:addSource",
                uri.trim(),
                sourceType,
                displayName.trim() || undefined,
            );

            if (!result) {
                setError("A source with this URI already exists");
                return;
            }

            setUri("");
            setDisplayName("");
            setIsSubmitting(false);
            window.close();
        } catch (err) {
            setIsSubmitting(false);
            setError(
                err instanceof Error ? err.message : "Failed to add source",
            );
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
                <Input
                    type="text"
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
                <Input
                    required
                    type="text"
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
            {error && (
                <div className="rounded-md border border-red-400 bg-linear-to-t from-red-500/20 to-red-500/10 p-4 text-sm text-red-950 dark:bg-linear-to-b dark:text-red-100">
                    {error}
                </div>
            )}
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
