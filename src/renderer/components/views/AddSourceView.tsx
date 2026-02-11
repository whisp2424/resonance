import { Form } from "@base-ui/react/form";
import Button from "@renderer/components/ui/Button";
import { Field, FieldLabel } from "@renderer/components/ui/Field";
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
import { Controller, useForm } from "react-hook-form";

interface AddSourceFormData {
    uri: string;
    backend: string;
    displayName?: string;
}

export default function AddSourceView() {
    const { pickFolder } = useDialog();
    const addSource = useAddSource();

    const {
        register,
        handleSubmit,
        control,
        setValue,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<AddSourceFormData>({
        defaultValues: {
            backend: "local",
            uri: "",
            displayName: "",
        },
    });

    const sourceBackendItems = [{ label: "Local", value: "local" }] as const;

    useShortcut({ code: "Escape" }, () => window.close());

    const onSubmit = async (data: AddSourceFormData) => {
        const uri = data.uri.trim();

        if (!uri) {
            setError("uri", {
                type: "manual",
                message: "A location pointing to the source is required",
            });
            return;
        }

        const result = await addSource.mutateAsync({
            uri,
            backend: data.backend,
            name: data.displayName?.trim() || undefined,
        });

        if (result.success) {
            window.close();
            return;
        }

        switch (result.error) {
            case "duplicate":
                setError("uri", {
                    type: "manual",
                    message:
                        result.message ||
                        "This media source has already been added to your library",
                });
                break;
            case "invalid":
                setError("uri", {
                    type: "manual",
                    message:
                        result.message ||
                        "The location provided is not valid for the selected media backend",
                });
                break;
            case "unknown":
            default:
                setError("uri", {
                    type: "manual",
                    message: result.message || "An unexpected error occurred",
                });
        }
    };

    const handleBrowseClick = async () => {
        const folder = await pickFolder();
        if (folder) {
            setValue("uri", folder);
            clearErrors("uri");
        }
    };

    return (
        <Form
            className="mt-(--spacing-titlebar-height) flex flex-1 flex-col justify-between gap-8 overflow-y-scroll px-12 pb-8"
            onSubmit={handleSubmit(onSubmit)}>
            <h1 className="text-4xl font-light">New media source</h1>
            <Field
                name="backend"
                className="flex flex-row items-center justify-between gap-8">
                <div>
                    <FieldLabel className="text-lg">Media backend</FieldLabel>
                    <p className="text-sm opacity-50">
                        The backend you choose determines how media is imported,
                        scanned, and played.
                    </p>
                </div>
                <Controller
                    name="backend"
                    control={control}
                    render={({ field }) => (
                        <Select
                            value={field.value}
                            onValueChange={field.onChange}>
                            <SelectTrigger>
                                <SelectValue>
                                    {sourceBackendItems.find(
                                        (item) => item.value === field.value,
                                    )?.label || field.value}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {sourceBackendItems.map((item) => (
                                    <SelectItem
                                        key={item.value}
                                        value={item.value}>
                                        {item.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}
                />
            </Field>
            <div className="flex flex-1 gap-4">
                <Field name="displayName" className="flex-2">
                    <FieldLabel>
                        Display name
                        <span className="px-1.5 opacity-40">(optional)</span>
                    </FieldLabel>
                    <TextInput
                        {...register("displayName")}
                        placeholder="my music library!"
                    />
                </Field>
                <Field name="uri" className="flex-3">
                    <FieldLabel>Location</FieldLabel>
                    <div className="flex flex-row gap-2">
                        <TextInput
                            {...register("uri", {
                                onChange: () => {
                                    if (errors.uri) {
                                        clearErrors("uri");
                                    }
                                },
                            })}
                            placeholder="/home/user/Music"
                        />
                        <Button type="button" onClick={handleBrowseClick}>
                            Browse
                        </Button>
                    </div>
                    {errors.uri && (
                        <div className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                            {errors.uri.message}
                        </div>
                    )}
                </Field>
            </div>
            <div className="flex flex-1 flex-row items-end justify-end gap-2">
                <Button type="button" onClick={() => window.close()}>
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="primary"
                    disabled={addSource.isPending}>
                    Add
                </Button>
            </div>
        </Form>
    );
}
