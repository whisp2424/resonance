import Button from "@renderer/components/ui/Button";

import IconFolder from "~icons/fluent/folder-48-filled";

export default function HomeView() {
    return (
        <div className="flex h-full flex-col items-center justify-center">
            <IconFolder className="size-24 opacity-20" />
            <div className="mt-2 mb-6 flex flex-col items-center justify-center text-center">
                <h1 className="text-xl">Welcome to {APP_NAME}</h1>
                <p className="text-sm opacity-50">
                    Import your music library to get started
                </p>
            </div>
            <Button
                onClick={async () =>
                    electron.invoke("window:new", "/settings", "settings")
                }>
                Settings
            </Button>
        </div>
    );
}
