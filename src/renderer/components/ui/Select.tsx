import type * as React from "react";

import { Select as BaseSelect } from "@base-ui/react/select";
import { twMerge } from "tailwind-merge";

import IconCheck from "~icons/lucide/check";
import IconChevronDown from "~icons/lucide/chevron-down";
import IconChevronUp from "~icons/lucide/chevron-up";
import IconChevronUpDown from "~icons/lucide/chevrons-up-down";

const Select = BaseSelect.Root;

function SelectGroup({
    className,
    ...props
}: Omit<BaseSelect.Group.Props, "className"> & { className?: string }) {
    return (
        <BaseSelect.Group
            data-slot="select-group"
            className={twMerge("scroll-my-1 p-1", className)}
            {...props}
        />
    );
}

function SelectValue({
    className,
    placeholder,
    children,
    ...props
}: Omit<BaseSelect.Value.Props, "className"> & {
    className?: string;
    placeholder?: React.ReactNode;
}) {
    return (
        <BaseSelect.Value
            data-slot="select-value"
            className={twMerge("flex flex-1 text-left", className)}
            placeholder={placeholder}
            {...props}>
            {children}
        </BaseSelect.Value>
    );
}

function SelectTrigger({
    className,
    size = "default",
    children,
    ...props
}: Omit<BaseSelect.Trigger.Props, "className"> & {
    size?: "sm" | "default";
    className?: string;
}) {
    return (
        <BaseSelect.Trigger
            data-slot="select-trigger"
            data-size={size}
            className={twMerge(
                "flex w-fit flex-row items-center justify-between gap-2 rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-1 text-sm whitespace-nowrap transition duration-300 outline-none hover:border-neutral-400 hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-50 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}>
            {children}
            <BaseSelect.Icon
                render={
                    <IconChevronUpDown className="pointer-events-none size-4 text-black/40 dark:text-white/40" />
                }
            />
        </BaseSelect.Trigger>
    );
}

function SelectContent({
    className,
    children,
    side = "bottom",
    sideOffset = 8,
    align = "center",
    alignOffset = 0,
    alignItemWithTrigger = false,
    ...props
}: Omit<BaseSelect.Popup.Props, "className"> & { className?: string } & Pick<
        BaseSelect.Positioner.Props,
        "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
    >) {
    return (
        <BaseSelect.Portal>
            <BaseSelect.Positioner
                side={side}
                sideOffset={sideOffset}
                align={align}
                alignOffset={alignOffset}
                alignItemWithTrigger={alignItemWithTrigger}
                className="isolate z-50">
                <BaseSelect.Popup
                    data-slot="select-content"
                    data-align-trigger={alignItemWithTrigger}
                    className={twMerge(
                        "relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-28 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg border border-neutral-300 bg-neutral-100 py-1.5 shadow-md duration-100 outline-none dark:border-neutral-800 dark:bg-neutral-900",
                        className,
                    )}
                    {...props}>
                    <SelectScrollUpButton />
                    <BaseSelect.List>{children}</BaseSelect.List>
                    <SelectScrollDownButton />
                </BaseSelect.Popup>
            </BaseSelect.Positioner>
        </BaseSelect.Portal>
    );
}

function SelectLabel({
    className,
    ...props
}: Omit<BaseSelect.GroupLabel.Props, "className"> & { className?: string }) {
    return (
        <BaseSelect.GroupLabel
            data-slot="select-label"
            className={twMerge(
                "px-4 py-1 text-xs text-black/40 dark:text-white/40",
                className,
            )}
            {...props}
        />
    );
}

function SelectItem({
    className,
    children,
    ...props
}: Omit<BaseSelect.Item.Props, "className"> & { className?: string }) {
    return (
        <BaseSelect.Item
            data-slot="select-item"
            className={twMerge(
                "relative flex w-full cursor-default items-center gap-4 py-1 pr-8 pl-4 text-sm outline-hidden select-none hover:bg-neutral-200 focus-visible:bg-neutral-200 data-disabled:pointer-events-none data-disabled:opacity-50 dark:hover:bg-neutral-800 dark:focus-visible:bg-neutral-800 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
                className,
            )}
            {...props}>
            <BaseSelect.ItemText>{children}</BaseSelect.ItemText>
            <BaseSelect.ItemIndicator
                render={
                    <span className="pointer-events-none absolute right-4.5 flex size-4 items-center justify-center">
                        <IconCheck className="pointer-events-none opacity-40" />
                    </span>
                }
            />
        </BaseSelect.Item>
    );
}

function SelectSeparator({
    className,
    ...props
}: Omit<BaseSelect.Separator.Props, "className"> & { className?: string }) {
    return (
        <BaseSelect.Separator
            data-slot="select-separator"
            className={twMerge(
                "pointer-events-none -mx-1 my-1 h-px bg-neutral-300 dark:bg-neutral-700",
                className,
            )}
            {...props}
        />
    );
}

function SelectScrollUpButton({
    className,
    ...props
}: Omit<React.ComponentProps<typeof BaseSelect.ScrollUpArrow>, "className"> & {
    className?: string;
}) {
    return (
        <BaseSelect.ScrollUpArrow
            data-slot="select-scroll-up-button"
            className={twMerge(
                "top-0 z-10 flex w-full cursor-default items-center justify-center bg-neutral-100 py-1 dark:bg-neutral-900 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}>
            <IconChevronUp />
        </BaseSelect.ScrollUpArrow>
    );
}

function SelectScrollDownButton({
    className,
    ...props
}: Omit<
    React.ComponentProps<typeof BaseSelect.ScrollDownArrow>,
    "className"
> & { className?: string }) {
    return (
        <BaseSelect.ScrollDownArrow
            data-slot="select-scroll-down-button"
            className={twMerge(
                "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-neutral-100 py-1 dark:bg-neutral-900 [&_svg:not([class*='size-'])]:size-4",
                className,
            )}
            {...props}>
            <IconChevronDown />
        </BaseSelect.ScrollDownArrow>
    );
}

export {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectScrollDownButton,
    SelectScrollUpButton,
    SelectSeparator,
    SelectTrigger,
    SelectValue,
};
