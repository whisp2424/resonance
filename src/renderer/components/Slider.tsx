import { Slider as BaseSlider } from "@base-ui/react/slider";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

interface SliderProps {
    defaultValue?: number;
    max?: number;
    className?: string;
    indicatorClassName?: string;
}

export default function Slider({
    defaultValue = 0,
    max = 100,
    className,
    indicatorClassName,
}: SliderProps) {
    return (
        <BaseSlider.Root
            thumbAlignment="edge"
            className={twMerge(clsx("group w-64", className))}
            defaultValue={defaultValue}
            max={max}>
            <BaseSlider.Control className="h-2 w-full">
                <BaseSlider.Track className="h-full w-full bg-white/10 transition group-hover:bg-white/20">
                    <BaseSlider.Indicator
                        className={twMerge(
                            clsx(
                                "h-full bg-(--accent-color)",
                                indicatorClassName,
                            ),
                        )}
                    />
                    <BaseSlider.Thumb className="aspect-square h-full bg-white" />
                </BaseSlider.Track>
            </BaseSlider.Control>
        </BaseSlider.Root>
    );
}
