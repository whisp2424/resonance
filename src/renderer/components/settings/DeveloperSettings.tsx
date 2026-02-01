import type { DialogType } from "@shared/types/dialog";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
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
import TextInput from "@renderer/components/ui/TextInput";
import { useDialog } from "@renderer/hooks/useDialog";
import { useState } from "react";

export function DeveloperSettings() {
    const { openDialog } = useDialog();

    const [dialogType, setDialogType] = useState<DialogType>("info");
    const [title, setTitle] = useState("Dialog Title");
    const [description, setDescription] = useState(
        "This is a dialog description.",
    );
    const [primaryLabel, setPrimaryLabel] = useState("OK");
    const [secondaryLabel, setSecondaryLabel] = useState("Cancel");
    const [showSecondary, setShowSecondary] = useState(false);
    const [isCancelable, setIsCancelable] = useState(true);
    const [customId, setCustomId] = useState("");
    const [customWidth, setCustomWidth] = useState<number | undefined>(
        undefined,
    );
    const [customHeight, setCustomHeight] = useState<number | undefined>(
        undefined,
    );

    const handleOpenDialog = async () => {
        if (!customId) {
            console.warn("Dialog ID is required");
            return;
        }

        const buttons = [
            ...(showSecondary
                ? [
                      {
                          label: secondaryLabel,
                          value: "secondary",
                          variant: "secondary" as const,
                      },
                  ]
                : []),
            {
                label: primaryLabel,
                value: "primary",
                variant: "primary" as const,
                default: true,
            },
        ];

        const result = await openDialog({
            type: dialogType,
            title,
            description,
            id: customId,
            buttons,
            cancelable: isCancelable,
            width: customWidth,
            height: customHeight,
        });

        console.log("Dialog result:", result);
    };

    return (
        <SettingsCategory title="Developer Settings">
            <div className="flex flex-col gap-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field name="type">
                        <FieldLabel>Type</FieldLabel>
                        <Select
                            value={dialogType}
                            onValueChange={(v) =>
                                setDialogType(v as DialogType)
                            }>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="info">Info</SelectItem>
                                <SelectItem value="warning">Warning</SelectItem>
                                <SelectItem value="error">Error</SelectItem>
                                <SelectItem value="confirm">Confirm</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>

                    <Field name="cancelable">
                        <FieldLabel>Cancelable</FieldLabel>
                        <Select
                            value={isCancelable ? "true" : "false"}
                            onValueChange={(v) =>
                                setIsCancelable(v === "true")
                            }>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="true">
                                    True (ESC works)
                                </SelectItem>
                                <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                        </Select>
                    </Field>
                </div>

                <Field name="title">
                    <FieldLabel>Title</FieldLabel>
                    <TextInput
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </Field>

                <Field name="description">
                    <FieldLabel>Description</FieldLabel>
                    <TextInput
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field name="primary">
                        <FieldLabel>Primary Button</FieldLabel>
                        <TextInput
                            value={primaryLabel}
                            onChange={(e) => setPrimaryLabel(e.target.value)}
                        />
                    </Field>

                    <Field name="secondary">
                        <FieldLabel>Secondary Button</FieldLabel>
                        <div className="flex gap-2">
                            <TextInput
                                value={secondaryLabel}
                                disabled={!showSecondary}
                                onChange={(e) =>
                                    setSecondaryLabel(e.target.value)
                                }
                            />
                            <Button
                                variant={
                                    showSecondary ? "primary" : "secondary"
                                }
                                onClick={() =>
                                    setShowSecondary(!showSecondary)
                                }>
                                {showSecondary ? "Hide" : "Show"}
                            </Button>
                        </div>
                    </Field>
                </div>

                <Field name="customId">
                    <FieldLabel>Dialog ID</FieldLabel>
                    <TextInput
                        value={customId}
                        placeholder="e.g., unsaved-changes-dialog"
                        onChange={(e) => setCustomId(e.target.value)}
                    />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field name="width">
                        <FieldLabel>Width (optional)</FieldLabel>
                        <NumberInput
                            value={customWidth}
                            placeholder="600"
                            min={0}
                            onChange={(e) => {
                                const value = e.target.value;
                                setCustomWidth(
                                    value
                                        ? Number.parseInt(value, 10)
                                        : undefined,
                                );
                            }}
                        />
                    </Field>

                    <Field name="height">
                        <FieldLabel>Height (optional)</FieldLabel>
                        <NumberInput
                            value={customHeight}
                            placeholder="200"
                            min={0}
                            onChange={(e) => {
                                const value = e.target.value;
                                setCustomHeight(
                                    value
                                        ? Number.parseInt(value, 10)
                                        : undefined,
                                );
                            }}
                        />
                    </Field>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        disabled={Boolean(!customId.trim())}
                        onClick={handleOpenDialog}>
                        Open Dialog
                    </Button>
                </div>
            </div>
        </SettingsCategory>
    );
}
