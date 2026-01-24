import type { IconElement } from "@renderer/types/iconElement";
import type {
    AnchorHTMLAttributes,
    ButtonHTMLAttributes,
    ReactNode,
} from "react";

import clsx from "clsx";
import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";

type BaseProps = {
    icon?: IconElement;
    children?: ReactNode;
    className?: string;
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

export default function Button({
    children,
    className,
    icon: Icon,
    ...rest
}: ButtonProps) {
    className = twMerge(
        clsx(
            "flex flex-row items-center gap-2 px-5 py-1.5",
            "text-sm transition duration-300",
            "rounded-lg border shadow",
            "border-neutral-950/10 bg-white text-neutral-900",
            "hover:border-neutral-950/20 active:border-neutral-950/20",
            "hover:bg-neutral-50 active:bg-neutral-100 active:shadow-inner",
            "dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-100",
            "dark:hover:border-white/20 dark:active:border-white/20",
            "dark:hover:bg-neutral-800 dark:active:bg-neutral-900",
            className,
        ),
    );
    if ("as" in rest) {
        if (rest.as === "a") {
            const { ...anchorProps } = rest;
            return (
                <a className={className} {...anchorProps}>
                    {Icon && <Icon className="translate-y-[0.05em]" />}
                    {children}
                </a>
            );
        }

        if (rest.as === "link") {
            const { to, replace, ...linkProps } = rest;
            return (
                <Link
                    className={className}
                    to={to}
                    replace={replace}
                    {...linkProps}>
                    {Icon && <Icon className="translate-y-[0.05em]" />}
                    {children}
                </Link>
            );
        }
    }

    const { ...buttonProps } = rest as ButtonAsButton;
    return (
        <button className={className} {...buttonProps}>
            {Icon && <Icon className="translate-y-[0.05em]" />}
            {children}
        </button>
    );
}
