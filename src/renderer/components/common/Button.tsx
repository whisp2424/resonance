import type { IconElement } from "@/types/iconElement";

import { Button as BaseButton } from "@base-ui/react/button";
import clsx from "clsx";
import { Link } from "react-router-dom";
import { twMerge } from "tailwind-merge";

type BaseProps = {
    icon?: IconElement;
    children?: React.ReactNode;
};

type ButtonAsButton = BaseProps &
    BaseButton.Props & {
        as?: "button";
    };

type ButtonAsAnchor = BaseProps &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & {
        as: "a";
        href: string;
    };

type ButtonAsLink = BaseProps & {
    as: "link";
    to: string;
    replace?: boolean;
};

type ButtonProps = ButtonAsButton | ButtonAsAnchor | ButtonAsLink;

const baseStyles =
    "flex items-center justify-center gap-2 rounded-sm bg-neutral-900 px-4 py-2 text-sm transition duration-300 ease-out hover:bg-neutral-900/80 active:scale-95";

export default function Button({ children, icon: Icon, ...rest }: ButtonProps) {
    const className = twMerge(clsx(baseStyles));

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
        <BaseButton className={className} {...buttonProps}>
            {Icon && <Icon className="translate-y-[0.05em]" />}
            {children}
        </BaseButton>
    );
}
