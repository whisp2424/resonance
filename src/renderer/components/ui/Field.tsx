import type { ReactNode } from "react";

import { Field as BaseField } from "@base-ui/react/field";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

const FieldRoot = BaseField.Root;

function FieldLabel({
    className,
    children,
    ...props
}: Omit<BaseField.Label.Props, "className"> & {
    className?: string;
    children: ReactNode;
}) {
    return (
        <BaseField.Label
            nativeLabel={false}
            className={twMerge(clsx("mb-1.5 block text-sm", className))}
            {...props}>
            {children}
        </BaseField.Label>
    );
}

function FieldDescription({
    className,
    children,
    ...props
}: Omit<BaseField.Description.Props, "className"> & {
    className?: string;
    children: ReactNode;
}) {
    return (
        <BaseField.Description
            className={twMerge(clsx("mt-1.5 text-sm opacity-50", className))}
            {...props}>
            {children}
        </BaseField.Description>
    );
}

function FieldError({
    className,
    children,
    ...props
}: Omit<BaseField.Error.Props, "className"> & {
    className?: string;
    children: ReactNode;
}) {
    return (
        <BaseField.Error
            className={twMerge(
                clsx(
                    "mt-1.5 text-sm text-red-600 dark:text-red-400",
                    className,
                ),
            )}
            {...props}>
            {children}
        </BaseField.Error>
    );
}

export { FieldDescription, FieldError, FieldLabel, FieldRoot as Field };
