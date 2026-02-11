import type { InputHTMLAttributes } from "react";

import { Input as BaseInput } from "@base-ui/react/input";
import clsx from "clsx";
import { forwardRef } from "react";

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
    ({ className, ...props }, ref) => {
        return (
            <BaseInput
                ref={ref}
                type="text"
                className={clsx(
                    "w-full rounded-lg border border-neutral-300 bg-white px-3 py-1 text-sm text-neutral-800 transition duration-150 ease-out placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:placeholder:text-neutral-500 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600",
                    className,
                )}
                {...props}
            />
        );
    },
);

TextInput.displayName = "TextInput";
export default TextInput;
