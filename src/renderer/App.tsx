import MiniPlayer from "@/components/MiniPlayer";
import TitleBar from "@/components/TitleBar";
import { useAccentColor } from "@/hooks/useAccentColor";

export default function App() {
    const accentColor = useAccentColor();

    return (
        <div
            className="flex h-dvh w-full flex-col"
            style={{ "--accent-color": accentColor } as React.CSSProperties}>
            <TitleBar />
            <div className="flex-1"></div>
            <MiniPlayer />
        </div>
    );
}
