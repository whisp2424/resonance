import { SettingsCategory } from "@renderer/components/settings/SettingsCategory";
import { Field, FieldLabel } from "@renderer/components/ui/Field";
import Input from "@renderer/components/ui/Input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";
import { useState } from "react";

import Button from "../ui/Button";

export default function AddSourceView() {
    const [sourceType, setSourceType] = useState("local");

    const sourceTypeItems = [{ label: "Local", value: "local" }] as const;

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
                        if (newValue) setSourceType(newValue);
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
                <Input type="text" placeholder="Music" />
            </Field>
            <Field name="displayName">
                <FieldLabel>URI</FieldLabel>
                <Input type="text" placeholder="C:/Users/..." />
            </Field>
            <div className="flex flex-1 items-end justify-end gap-4">
                <Button>Add</Button>
            </div>
        </SettingsCategory>
    );
}
