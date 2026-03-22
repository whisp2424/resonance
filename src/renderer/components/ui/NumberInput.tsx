import type { NumberField } from "@base-ui/react/number-field";

import { NumberField as BaseNumberField } from "@base-ui/react/number-field";
import clsx from "clsx";

import ChevronDown from "~icons/lucide/chevron-down";
import ChevronUp from "~icons/lucide/chevron-up";

type NumberInputProps = Omit<NumberField.Root.Props, "className"> & {
    className?: string;
};

export default function NumberInput(props: NumberInputProps) {
    const { className, step = 1, ...rootProps } = props;

    return (
        <BaseNumberField.Root {...rootProps} step={step}>
            <BaseNumberField.Group className="relative flex items-center">
                <BaseNumberField.Input
                    className={clsx(
                        "w-full rounded-lg border border-neutral-300 bg-white px-3 py-1 pr-8 text-sm text-neutral-800 transition duration-150 ease-out placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600",
                        "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                        className,
                    )}
                />
                <div className="absolute top-1/2 right-2 flex -translate-y-1/2 flex-col">
                    <BaseNumberField.Increment
                        className="opacity-50 hover:opacity-80"
                        tabIndex={-1}>
                        <ChevronUp className="size-3" />
                    </BaseNumberField.Increment>
                    <BaseNumberField.Decrement
                        className="opacity-50 hover:opacity-80"
                        tabIndex={-1}>
                        <ChevronDown className="size-3" />
                    </BaseNumberField.Decrement>
                </div>
            </BaseNumberField.Group>
        </BaseNumberField.Root>
    );
}
