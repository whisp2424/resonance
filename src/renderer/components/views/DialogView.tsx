import type { DialogOptions, DialogType } from "@shared/types/dialog";

import { useEffect, useState } from "react";

import Button from "../ui/Button";

import IconAlertOctagon from "~icons/lucide/alert-octagon";
import IconAlertTriangle from "~icons/lucide/alert-triangle";
import IconHelpCircle from "~icons/lucide/help-circle";
import IconInfo from "~icons/lucide/info";

const DEFAULT_BUTTONS: Record<DialogType, Required<DialogOptions>["buttons"]> =
    {
        info: [{ label: "OK", value: "ok", variant: "primary", default: true }],
        warning: [
            { label: "OK", value: "ok", variant: "primary", default: true },
        ],
        error: [
            { label: "OK", value: "ok", variant: "primary", default: true },
        ],
        confirm: [
            { label: "Cancel", value: "cancel", variant: "secondary" },
            { label: "OK", value: "ok", variant: "primary", default: true },
        ],
    };

const ICONS: Record<DialogType, typeof IconInfo> = {
    info: IconInfo,
    warning: IconAlertTriangle,
    error: IconAlertOctagon,
    confirm: IconHelpCircle,
};

export default function DialogView() {
    const [windowId, setWindowId] = useState<string | null>(null);
    const [options, setOptions] = useState<DialogOptions | null>(null);

    useEffect(() => {
        electron.invoke("window:getId").then(setWindowId);
    }, []);

    useEffect(() => {
        if (!windowId) return;
        electron.invoke("dialog:getOptions", windowId).then(setOptions);
    }, [windowId]);

    useEffect(() => {
        if (!windowId || !options) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                if (options.cancelable ?? true) {
                    electron.invoke("dialog:close", windowId, null);
                }
                return;
            }

            if (event.key === "Enter") {
                const allButtons =
                    options.buttons ?? DEFAULT_BUTTONS[options.type];
                const defaultButton = allButtons.find((b) => b.default);
                if (defaultButton) {
                    electron.invoke(
                        "dialog:close",
                        windowId,
                        defaultButton.value,
                    );
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [options, windowId]);

    if (!options || !windowId) return null;

    const Icon = ICONS[options.type];
    const buttons = options.buttons ?? DEFAULT_BUTTONS[options.type];

    return (
        <div className="flex h-full flex-row items-start gap-4 p-5">
            <div className="flex items-center justify-center pt-1">
                <Icon className="size-6" />
            </div>
            <div className="flex flex-1 flex-col justify-center gap-3">
                <div>
                    <h1 className="text-base font-semibold">{options.title}</h1>
                    <p className="text-sm opacity-70">{options.description}</p>
                </div>
                <div className="flex gap-2 pt-1">
                    {buttons.map((button) => (
                        <Button
                            key={button.value}
                            variant={button.variant}
                            onClick={() =>
                                electron.invoke(
                                    "dialog:close",
                                    windowId,
                                    button.value,
                                )
                            }>
                            {button.label}
                        </Button>
                    ))}
                </div>
            </div>
        </div>
    );
}
