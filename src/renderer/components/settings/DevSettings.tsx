import type { DialogType } from "@shared/types/dialog";

import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import Button from "@renderer/components/ui/Button";
import { Field, FieldLabel } from "@renderer/components/ui/Field";
import Input from "@renderer/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import { useDialog } from "@renderer/hooks/useDialog";
import { useState } from "react";

export function DevSettings() {
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

    const handleOpenDialog = async () => {
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
            buttons,
            cancelable: isCancelable,
            ...(customId && { id: customId }),
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
                    <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                    />
                </Field>

                <Field name="description">
                    <FieldLabel>Description</FieldLabel>
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field name="primary">
                        <FieldLabel>Primary Button</FieldLabel>
                        <Input
                            value={primaryLabel}
                            onChange={(e) => setPrimaryLabel(e.target.value)}
                        />
                    </Field>

                    <Field name="secondary">
                        <FieldLabel>Secondary Button</FieldLabel>
                        <div className="flex gap-2">
                            <Input
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
                    <FieldLabel>
                        Custom ID{" "}
                        <span className="font-normal opacity-50">
                            (modal if set, focus existing)
                        </span>
                    </FieldLabel>
                    <Input
                        value={customId}
                        placeholder="e.g., unsaved-changes-dialog"
                        onChange={(e) => setCustomId(e.target.value)}
                    />
                </Field>

                <div className="flex justify-end pt-2">
                    <Button onClick={handleOpenDialog}>Open Dialog</Button>
                </div>
            </div>
        </SettingsCategory>
    );
}
