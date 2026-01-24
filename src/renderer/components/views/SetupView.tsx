import Logo from "@renderer/assets/resonance-logo.svg?react";
import SetupImageDark from "@renderer/assets/setup-dark.png";
import SetupImageLight from "@renderer/assets/setup-light.png";
import Button from "@renderer/components/ui/Button";
import { useDarkTheme } from "@renderer/hooks/useDarkTheme";

import IconCog from "~icons/lucide/cog";

export default function SetupView() {
    const isDarkTheme = useDarkTheme();
    const backgroundImage = `url(${isDarkTheme ? SetupImageDark : SetupImageLight})`;
    return (
        <div className="flex h-full">
            <div
                className="z-60 flex flex-1 items-center justify-center border-r border-neutral-300 bg-cover bg-center max-lg:hidden dark:border-neutral-800"
                style={{ backgroundImage }}>
                <Logo className="w-96 max-w-[90%]" />
            </div>
            <div className="flex-1">
                <div className="flex h-full flex-col items-end justify-between px-10 pt-14 pb-10">
                    <div className="w-full">
                        <h1 className="text-5xl font-light">Welcome</h1>
                        <p className="mt-4 opacity-40">
                            To get started, setup your music library in the
                            settings.
                        </p>
                    </div>
                    <Button
                        icon={IconCog}
                        onClick={() => {
                            electron.invoke(
                                "window:new",
                                "/settings",
                                "settings",
                            );
                        }}>
                        Settings
                    </Button>
                </div>
            </div>
        </div>
    );
}
