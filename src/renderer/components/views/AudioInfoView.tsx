export default function AudioInfoView() {
    return (
        <div className="mt-(--spacing-titlebar-height) flex flex-1 flex-col gap-8 overflow-y-scroll px-12 pb-8">
            <div>
                <h1 className="text-4xl font-light">Audio information</h1>
                <p className="mt-4 text-sm opacity-60">
                    Inspect audio processing and decoding details
                </p>
            </div>
        </div>
    );
}
