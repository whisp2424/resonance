import type { ForwardRefExoticComponent, SVGProps } from "react";

export type IconElement = ForwardRefExoticComponent<
    SVGProps<SVGSVGElement> & { title?: string }
>;
