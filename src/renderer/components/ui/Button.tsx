import type { IconElement } from "@renderer/types/iconElement";
import type {
    AnchorHTMLAttributes,
    ButtonHTMLAttributes,
    ReactNode,
} from "react";

import clsx from "clsx";
import { Link } from "react-router-dom";

type BaseProps = {
    icon?: IconElement;
    className?: string;
    children: ReactNode;
    variant?: "primary" | "secondary";
};

type ButtonAsButton = BaseProps &
    ButtonHTMLAttributes<HTMLButtonElement> & {
        as?: "button";
    };

type ButtonAsAnchor = BaseProps &
    AnchorHTMLAttributes<HTMLAnchorElement> & {
        as: "a";
        href: string;
    };

type ButtonAsLink = BaseProps & {
    as: "link";
    to: string;
    replace?: boolean;
};

type ButtonProps = ButtonAsButton | ButtonAsAnchor | ButtonAsLink;

const variants = {
    primary: [
        clsx(
            "bg-linear-to-b from-[color-mix(in_oklab,var(--color-accent)_90%,white)] to-(--color-accent) text-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.25)] hover:from-(--color-accent) hover:to-[color-mix(in_oklab,var(--color-accent)_90%,black)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)] active:from-[color-mix(in_oklab,var(--color-accent)_90%,black)] active:to-[color-mix(in_oklab,var(--color-accent)_80%,black)] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.25)] dark:from-(--color-accent) dark:to-[color-mix(in_oklab,var(--color-accent)_80%,black)] dark:text-white/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.12)] dark:hover:from-[color-mix(in_oklab,var(--color-accent)_90%,white)] dark:hover:to-[color-mix(in_oklab,var(--color-accent)_95%,white)] dark:hover:shadow-[0_2px_4px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] dark:active:from-(--color-accent) dark:active:to-[color-mix(in_oklab,var(--color-accent)_80%,black)] dark:active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]",
        ),
    ],
    secondary: [
        clsx(
            "border border-neutral-300/80 bg-linear-to-b from-[#f5f5f5] to-[#e8e8e8] text-neutral-700 shadow-[0_0.5px_1px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.9)] hover:from-[#fafafa] hover:to-[#f0f0f0] hover:shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.95)] active:from-[#e0e0e0] active:to-[#d5d5d5] active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] dark:border-0 dark:from-[#3d3d3d] dark:to-[#323232] dark:text-neutral-200 dark:shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] dark:hover:from-[#454545] dark:hover:to-[#3a3a3a] dark:hover:text-neutral-100 dark:hover:shadow-[0_1px_3px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.1)] dark:active:from-[#353535] dark:active:to-[#2d2d2d] dark:active:shadow-[inset_0_0.5px_1px_rgba(0,0,0,0.2)]",
        ),
    ],
};

export default function Button({
    children,
    icon: Icon,
    variant = "secondary",
    ...rest
}: ButtonProps) {
    const className = clsx(
        "relative inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-1 text-sm transition duration-150 ease-out disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        rest.className ?? "",
    );

    if ("as" in rest) {
        if (rest.as === "a") {
            const { ...anchorProps } = rest;
            return (
                <a {...anchorProps} className={className}>
                    {Icon && <Icon className="size-4 translate-y-[0.05em]" />}
                    {children}
                </a>
            );
        }

        if (rest.as === "link") {
            const { to, replace, ...linkProps } = rest;
            return (
                <Link
                    {...linkProps}
                    className={className}
                    to={to}
                    replace={replace}>
                    {Icon && <Icon className="size-4 translate-y-[0.05em]" />}
                    {children}
                </Link>
            );
        }
    }

    const { ...buttonProps } = rest as ButtonAsButton;
    return (
        <button {...buttonProps} className={className}>
            {Icon && <Icon className="size-4 translate-y-[0.05em]" />}
            {children}
        </button>
    );
}
