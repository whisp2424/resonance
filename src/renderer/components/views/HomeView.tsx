import Button from "@/components/common/Button";
import IconFolder from "~icons/fluent/folder-48-filled";

export default function HomeView() {
    return (
        <div className="flex flex-1 flex-col items-center justify-center">
            <IconFolder className="size-24 opacity-20" />
            <div className="mt-2 mb-6 flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl">Welcome to Resonance</h1>
                <p className="opacity-50">
                    Import your music library to get started
                </p>
            </div>
            <Button as="link" to="/settings">
                Settings
            </Button>
        </div>
    );
}
