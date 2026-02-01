import type { InputHTMLAttributes, RefObject } from "react";

import { Input as BaseInput } from "@base-ui/react/input";
import clsx from "clsx";
import { useRef } from "react";

import ChevronDown from "~icons/lucide/chevron-down";
import ChevronUp from "~icons/lucide/chevron-up";

type NumberInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
    min?: number;
    max?: number;
    step?: number;
};

export default function NumberInput({
    className,
    min,
    max,
    step = 1,
    onChange,
    ...props
}: NumberInputProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleButtonClick = (delta: number) => {
        const input = inputRef.current;
        if (!input) return;

        const currentValue = parseFloat(input.value) || 0;
        let newValue = currentValue + delta;

        if (min !== undefined && newValue < min) newValue = min;
        if (max !== undefined && newValue > max) newValue = max;

        const descriptor = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value",
        );
        const nativeSetter = descriptor?.set;

        if (nativeSetter) {
            nativeSetter.call(input, String(newValue));
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));
        }
    };

    return (
        <div className="relative flex items-center">
            <BaseInput
                ref={inputRef as RefObject<HTMLInputElement>}
                type="number"
                className={clsx(
                    "h-8 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1 pr-8 text-sm text-neutral-800 transition duration-150 ease-out placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600",
                    "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                    className,
                )}
                min={min}
                max={max}
                step={step}
                onChange={onChange}
                {...props}
            />
            <div className="absolute top-1/2 right-2 flex -translate-y-1/2 flex-col">
                <button
                    type="button"
                    onClick={() => handleButtonClick(step)}
                    className="opacity-50 hover:opacity-80"
                    tabIndex={-1}>
                    <ChevronUp className="size-3" />
                </button>
                <button
                    type="button"
                    onClick={() => handleButtonClick(-step)}
                    className="opacity-50 hover:opacity-80"
                    tabIndex={-1}>
                    <ChevronDown className="size-3" />
                </button>
            </div>
        </div>
    );
}
