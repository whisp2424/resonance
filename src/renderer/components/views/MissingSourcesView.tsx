import CoversBackgroundDark from "@renderer/assets/covers-background-dark.png";
import CoversBackgroundLight from "@renderer/assets/covers-background-light.png";
import Logo from "@renderer/assets/resonance-logo.svg?react";
import Button from "@renderer/components/ui/Button";
import { useDarkTheme } from "@renderer/hooks/useDarkTheme";

import IconCog from "~icons/lucide/cog";

export default function SetupView() {
    const isDarkTheme = useDarkTheme();
    const backgroundImage = `url(${isDarkTheme ? CoversBackgroundDark : CoversBackgroundLight})`;
    return (
        <div
            className="flex h-full items-center justify-center bg-cover bg-center"
            style={{ backgroundImage }}>
            <div className="flex w-lg max-w-[90%] flex-col items-center justify-center">
                <Logo className="w-sm sm:w-md" />
                <p className="my-8 text-center text-balance opacity-50">
                    Your library is empty since no media sources have been setup
                    yet. You can add new media sources from the settings.
                </p>
                <Button
                    icon={IconCog}
                    onClick={() => {
                        electron.invoke("window:new", "/settings", "settings");
                    }}>
                    Settings
                </Button>
            </div>
        </div>
    );
}
