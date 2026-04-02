import type { ButtonHTMLAttributes, ComponentType, ReactNode } from "react";

import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

type Step = {
    icon: ComponentType<{ className?: string }>;
    label: string;
} & ButtonHTMLAttributes<HTMLButtonElement>;

type TimelineProps = {
    steps: Step[];
    renderStep?: (step: Step, index: number, vertical: boolean) => ReactNode;
    className?: string;
    minConnectorWidth?: number;
};

const STEP_MIN_WIDTH = 80;
const DEFAULT_MIN_CONNECTOR_WIDTH = 32;

function HorizontalStep({ icon: Icon, label, ...buttonProps }: Step) {
    return (
        <button
            {...buttonProps}
            className={twMerge(
                "group relative flex shrink-0 flex-col items-center",
                buttonProps.className,
                buttonProps.disabled ? "pointer-events-none" : "",
            )}>
            <div className="flex size-10 items-center justify-center opacity-60 transition-opacity duration-150 ease-out group-hover:opacity-80">
                <Icon className="size-5" />
            </div>
            <span className="pointer-events-none absolute top-full left-1/2 w-20 -translate-x-1/2 -translate-y-1 text-center text-sm wrap-break-word lowercase opacity-60 transition-opacity duration-150 ease-out group-hover:opacity-80">
                {label}
            </span>
        </button>
    );
}

function VerticalStep({ icon: Icon, label, ...buttonProps }: Step) {
    return (
        <button
            {...buttonProps}
            className={twMerge(
                "group flex items-center gap-3",
                buttonProps.className,
                buttonProps.disabled ? "pointer-events-none" : "",
            )}>
            <div className="flex size-10 shrink-0 items-center justify-center opacity-60 transition-opacity duration-150 ease-out group-hover:opacity-80">
                <Icon className="size-5" />
            </div>
            <span className="text-sm lowercase opacity-60 transition-opacity duration-150 ease-out group-hover:opacity-80">
                {label}
            </span>
        </button>
    );
}

export function Timeline({
    steps,
    renderStep,
    className,
    minConnectorWidth = DEFAULT_MIN_CONNECTOR_WIDTH,
}: TimelineProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVertical, setIsVertical] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const minWidth =
            steps.length * STEP_MIN_WIDTH +
            (steps.length - 1) * minConnectorWidth;

        const observer = new ResizeObserver(([entry]) => {
            setIsVertical(entry.contentRect.width < minWidth);
        });

        observer.observe(el);
        return () => observer.disconnect();
    }, [steps.length, minConnectorWidth]);

    if (isVertical) {
        return (
            <div
                ref={containerRef}
                className={twMerge("flex flex-col", className)}>
                {steps.map((step, index) => {
                    const isLast = index === steps.length - 1;
                    return (
                        <div key={step.label}>
                            {renderStep ? (
                                renderStep(step, index, true)
                            ) : (
                                <VerticalStep {...step} />
                            )}
                            {!isLast && (
                                <div className="ml-5 h-6 w-0.5 rounded-full bg-black opacity-20 dark:bg-white" />
                            )}
                        </div>
                    );
                })}
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={twMerge("flex w-full items-center", className)}>
            {steps.map((step, index) => {
                const isLast = index === steps.length - 1;
                return (
                    <div
                        key={step.label}
                        className={twMerge(
                            "flex items-center",
                            !isLast && "flex-1",
                        )}>
                        {renderStep ? (
                            renderStep(step, index, false)
                        ) : (
                            <HorizontalStep {...step} />
                        )}
                        {!isLast && (
                            <div className="h-0.5 flex-1 rounded-full bg-black opacity-20 dark:bg-white" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
