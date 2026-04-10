import { Switch as BaseSwitch } from "@base-ui/react/switch";
import { twMerge } from "tailwind-merge";

interface SwitchProps extends Omit<
    BaseSwitch.Root.Props,
    "className" | "nativeButton" | "render"
> {
    className?: string;
    thumbClassName?: string;
}

export function Switch({ className, thumbClassName, ...props }: SwitchProps) {
    return (
        <BaseSwitch.Root
            nativeButton
            render={<button type="button" />}
            data-slot="switch"
            className={twMerge(
                "relative inline-flex h-7 w-12 shrink-0 appearance-none items-center rounded-full border border-neutral-300 bg-linear-to-b from-[#dcdcdc] to-[#cecece] p-0.75 shadow-[0_0.5px_1px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.45)] transition duration-150 ease-out outline-none hover:from-[#e4e4e4] hover:to-[#d6d6d6] hover:shadow-[0_1px_2px_rgba(0,0,0,0.12),inset_0_1px_0_rgba(255,255,255,0.5)] focus-visible:ring-2 focus-visible:ring-(--color-accent) focus-visible:ring-offset-0 focus-visible:outline-none active:from-[#d0d0d0] active:to-[#c4c4c4] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.12)] disabled:pointer-events-none disabled:opacity-50 data-checked:border-0 data-checked:from-[color-mix(in_oklab,var(--color-accent)_90%,white)] data-checked:to-(--color-accent) data-checked:shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.25)] data-checked:hover:from-(--color-accent) data-checked:hover:to-[color-mix(in_oklab,var(--color-accent)_90%,black)] data-checked:active:from-[color-mix(in_oklab,var(--color-accent)_90%,black)] data-checked:active:to-[color-mix(in_oklab,var(--color-accent)_80%,black)] data-checked:active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] dark:border-0 dark:from-[#3d3d3d] dark:to-[#323232] dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:from-[#454545] dark:hover:to-[#3a3a3a] dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] dark:active:from-[#353535] dark:active:to-[#2d2d2d] dark:active:shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.2)] dark:data-checked:from-(--color-accent) dark:data-checked:to-[color-mix(in_oklab,var(--color-accent)_80%,black)] dark:data-checked:shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] dark:data-checked:hover:from-[color-mix(in_oklab,var(--color-accent)_90%,white)] dark:data-checked:hover:to-[color-mix(in_oklab,var(--color-accent)_95%,white)] dark:data-checked:hover:shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] dark:data-checked:active:from-(--color-accent) dark:data-checked:active:to-[color-mix(in_oklab,var(--color-accent)_80%,black)] dark:data-checked:active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
                className,
            )}
            {...props}>
            <BaseSwitch.Thumb
                data-slot="switch-thumb"
                className={twMerge(
                    "size-5.5 rounded-full bg-white shadow-[0_0.5px_1px_rgba(0,0,0,0.15),0_1px_2px_rgba(0,0,0,0.1)] transition-transform duration-150 ease-out data-checked:translate-x-5 dark:bg-neutral-100 dark:shadow-[0_0.5px_1px_rgba(0,0,0,0.4),0_1px_2px_rgba(0,0,0,0.3)]",
                    thumbClassName,
                )}
            />
        </BaseSwitch.Root>
    );
}
