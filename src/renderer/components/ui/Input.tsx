import type { InputHTMLAttributes } from "react";

import { Input as BaseInput } from "@base-ui/react/input";
import clsx from "clsx";

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export default function Input({ className, ...props }: InputProps) {
    return (
        <BaseInput
            className={clsx(
                "h-8 w-full rounded-lg border border-neutral-300/80 bg-white px-3 py-1 text-sm text-neutral-800 shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] transition duration-150 ease-out placeholder:text-neutral-400 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400 dark:border-neutral-600/80 dark:bg-[#2a2a2a] dark:text-neutral-200 dark:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] dark:placeholder:text-neutral-500 dark:disabled:bg-neutral-800 dark:disabled:text-neutral-600",
                className,
            )}
            {...props}
        />
    );
}
