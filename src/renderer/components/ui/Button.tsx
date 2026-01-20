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
            className,
            "rounded-md border-[1.2px] bg-linear-to-b from-transparent to-transparent px-3 py-1 text-sm transition duration-200 outline-none not-dark:border-neutral-400 not-dark:bg-neutral-100 not-dark:to-neutral-200 not-dark:hover:to-(--accent-color)/20 focus-visible:ring not-dark:active:from-black/2 not-dark:active:to-(--accent-color)/25 dark:border-neutral-800 dark:bg-neutral-900 dark:from-white/4 dark:hover:not-active:border-neutral-700 dark:active:from-transparent",
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
