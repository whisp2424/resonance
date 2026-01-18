import { useLocation } from "react-router-dom";

export default function NotFound() {
    const location = useLocation();
    return (
        <div className="flex h-full flex-col items-start justify-start px-8">
            <h1 className="text-4xl">missing view: {location.pathname}</h1>
            <p className="mt-2 opacity-50">
                You shouldn&apos;t be seeing this, report this issue to the
                developers!
            </p>
        </div>
    );
}
