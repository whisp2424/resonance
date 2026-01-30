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
    className?: string;
    children: ReactNode;
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
            "flex flex-row items-center gap-2 rounded-lg border border-neutral-300 bg-neutral-100 px-4 py-1 text-sm shadow transition duration-300 hover:border-neutral-400 hover:bg-neutral-200 active:border-neutral-400 active:bg-neutral-300 active:shadow-inner active:duration-200 active:ease-out dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700 dark:hover:bg-neutral-800 dark:active:border-neutral-700 dark:active:bg-neutral-900",
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
