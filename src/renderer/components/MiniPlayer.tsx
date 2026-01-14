import clsx from "clsx";

import Slider from "@/components/Slider";
import IconLyrics from "~icons/fluent/comment-text-32-regular";
import IconNext from "~icons/fluent/next-32-filled";
// import IconPause from "~icons/fluent/pause-32-filled";
import IconPlay from "~icons/fluent/play-32-filled";
import IconPrevious from "~icons/fluent/previous-32-filled";

interface MiniPlayerButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
}

function MiniPlayerButton({
    icon: Icon,
    className,
    ...rest
}: MiniPlayerButtonProps) {
    return (
        <button
            tabIndex={-1}
            className={clsx(
                "opacity-50 transition duration-200 ease-out hover:opacity-100 active:scale-90",
                className,
            )}
            {...rest}>
            <Icon className="size-8 scale-95" />
        </button>
    );
}

export default function MiniPlayer() {
    return (
        <div className="flex w-full flex-col overflow-hidden bg-neutral-950">
            <Slider
                className="w-full"
                indicatorClassName="shadow-[0_-10px_48px_0_var(--accent-color)]"
            />
            <div className="flex h-full w-full flex-row px-10 pt-4 pb-6">
                <div className="flex h-full min-w-0 flex-1 flex-row items-center justify-start gap-4">
                    <MiniPlayerButton icon={IconPrevious} />
                    <MiniPlayerButton icon={IconPlay} />
                    <MiniPlayerButton icon={IconNext} />
                </div>
                <div className="flex h-full min-w-0 flex-2 flex-col items-center justify-center text-center">
                    <span>In the End</span>
                    <span className="text-sm opacity-50">Linkin Park</span>
                </div>
                <div className="flex h-full min-w-0 flex-1 flex-row items-center justify-end gap-4">
                    <MiniPlayerButton icon={IconLyrics} />
                </div>
            </div>
        </div>
    );
}
