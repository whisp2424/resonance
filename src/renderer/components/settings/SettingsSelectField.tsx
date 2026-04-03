import { SettingsRow } from "@renderer/components/settings/SettingsRow";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@renderer/components/ui/Select";

interface SelectOption<Value extends string> {
    label: string;
    value: Value;
}

interface SettingsSelectFieldProps<Value extends string> {
    title: string;
    description: string;
    items: readonly SelectOption<Value>[];
    value?: Value;
    placeholder?: string;
    layout?: "inline" | "stacked";
    triggerClassName?: string;
    onValueChange?: (value: Value) => void | Promise<void>;
}

export function SettingsSelectField<Value extends string>({
    title,
    description,
    items,
    value,
    placeholder,
    layout,
    onValueChange,
}: SettingsSelectFieldProps<Value>) {
    const fallbackValue = items[0]?.value;
    if (!fallbackValue) return null;

    return (
        <SettingsRow title={title} description={description} layout={layout}>
            <Select
                items={items}
                value={value ?? fallbackValue}
                onValueChange={(newValue) => {
                    if (newValue === null) return;
                    void onValueChange?.(newValue);
                }}>
                <SelectTrigger className="min-w-32">
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                    {items.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </SettingsRow>
    );
}
