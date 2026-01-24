import Logo from "@renderer/assets/resonance-logo.svg?react";
import SetupImageDark from "@renderer/assets/setup-dark.png";
import SetupImageLight from "@renderer/assets/setup-light.png";
import Button from "@renderer/components/ui/Button";
import { useDarkTheme } from "@renderer/hooks/useDarkTheme";

export default function SetupView() {
    const isDarkTheme = useDarkTheme();
    const backgroundImage = `url(${isDarkTheme ? SetupImageDark : SetupImageLight})`;
    return (
        <div
            className="flex h-full items-center justify-center bg-cover bg-center"
            style={{ backgroundImage }}>
            <div className="flex w-[90%] max-w-xl flex-col items-center justify-center gap-8">
                <Logo />
                <p className="opacity-40">
                    No music files found, import your library to get started.
                </p>
                <Button
                    onClick={async () =>
                        electron.invoke("window:new", "/settings", "settings")
                    }>
                    Settings
                </Button>
            </div>
        </div>
    );
}
