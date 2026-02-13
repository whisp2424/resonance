import { Form } from "@base-ui/react/form";
import Button from "@renderer/components/ui/Button";
import { Field, FieldLabel } from "@renderer/components/ui/Field";
import TextInput from "@renderer/components/ui/TextInput";
import { useAddSource } from "@renderer/hooks/library/useSources";
import { useDialog } from "@renderer/hooks/useDialog";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useForm } from "react-hook-form";

interface AddSourceFormData {
    path: string;
    displayName?: string;
}

export default function AddSourceView() {
    const { pickFolder } = useDialog();
    const addSource = useAddSource();

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        clearErrors,
        formState: { errors },
    } = useForm<AddSourceFormData>({
        defaultValues: {
            path: "",
            displayName: "",
        },
    });

    useHotkey("Escape", () => window.close());

    const onSubmit = async (data: AddSourceFormData) => {
        const path = data.path.trim();

        if (!path) {
            setError("path", {
                type: "manual",
                message: "A valid path is required",
            });
            return;
        }

        const result = await addSource.mutateAsync({
            path,
            name: data.displayName?.trim(),
        });

        if (result.success) {
            window.close();
            return;
        }

        switch (result.error) {
            case "duplicate_source":
                setError("path", {
                    type: "manual",
                    message:
                        result.message ||
                        "This media source has already been added to your library",
                });
                break;
            case "invalid_source":
                setError("path", {
                    type: "manual",
                    message: result.message || "The provided path is not valid",
                });
                break;
            case "unknown":
            default:
                setError("path", {
                    type: "manual",
                    message:
                        result.message ||
                        "Something went wrong, please try again",
                });
        }
    };

    const handleBrowseClick = async () => {
        const folder = await pickFolder();
        if (folder) {
            setValue("path", folder);
            clearErrors("path");
        }
    };

    return (
        <Form
            className="mt-(--spacing-titlebar-height) flex flex-1 flex-col justify-between gap-8 overflow-y-scroll px-12 pb-8"
            onSubmit={handleSubmit(onSubmit)}>
            <div>
                <h1 className="text-4xl font-light">New media source</h1>
                <p className="mt-4 text-sm opacity-60">
                    Pick a folder to import your music from. Resonance will
                    watch this folder for updates and new files.
                </p>
            </div>
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
                <Field name="path" className="flex-3">
                    <FieldLabel>Location</FieldLabel>
                    <div className="flex flex-row gap-2">
                        <TextInput
                            {...register("path", {
                                onChange: () => {
                                    if (errors.path) {
                                        clearErrors("path");
                                    }
                                },
                            })}
                            placeholder="/home/user/Music"
                        />
                        <Button type="button" onClick={handleBrowseClick}>
                            Browse
                        </Button>
                    </div>
                    {errors.path && (
                        <div className="mt-1.5 text-xs text-red-500 dark:text-red-400">
                            {errors.path.message}
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
