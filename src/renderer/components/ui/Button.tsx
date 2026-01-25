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
            "flex flex-row items-center gap-2 px-4 py-2",
            "rounded-xl border text-sm",
            "transition duration-300 active:duration-200 active:ease-out",
            "border-neutral-300 bg-linear-to-b from-transparent to-black/5",
            "hover:from-black/5 hover:to-black/10",
            "active:from-black/10 active:to-black/10",
            "dark:border-neutral-800 dark:from-white/5 dark:to-transparent",
            "dark:hover:from-white/10 dark:hover:to-white/5",
            "dark:active:from-white/10 dark:active:to-white/10",
            "active:shadow-inner",
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
