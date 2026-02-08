import type { ReactNode } from "react";

interface KeepAliveProps {
    active: boolean;
    children: ReactNode;
}

/**
 * KeepAlive preserves component state by keeping children mounted even when
 * inactive.
 *
 * Uses `visibility: hidden` and `content-visibility: auto` to minimize memory
 * and rendering overhead for inactive tabs.
 */
export default function KeepAlive({ active, children }: KeepAliveProps) {
    return (
        <div
            className="absolute inset-0 size-full overflow-hidden"
            style={{
                visibility: active ? "visible" : "hidden",
                contentVisibility: active ? "visible" : "auto",
            }}>
            {children}
        </div>
    );
}
