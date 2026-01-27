import Logo from "@renderer/assets/resonance-logo.svg?react";

export function AboutSettings() {
    return (
        <div className="m-auto flex flex-1 flex-col items-center justify-center gap-4 px-12 text-center">
            <Logo className="w-80" />
            <div className="flex items-center gap-2 text-sm opacity-50">
                <span>{APP_VERSION}</span>
                <span className="opacity-50">&bull;</span>
                <a
                    href="https://github.com/whispmoe/resonance"
                    target="_blank"
                    rel="noreferrer">
                    github
                </a>
            </div>
        </div>
    );
}
