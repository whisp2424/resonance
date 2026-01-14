import { useLocation } from "react-router-dom";

import Button from "@/components/common/Button";
import IconError from "~icons/fluent/error-circle-48-filled";

export default function NotFound() {
    const location = useLocation();
    return (
        <div className="flex flex-1 flex-col items-center justify-center">
            <IconError className="size-24 opacity-20" />
            <div className="mt-2 mb-6 flex flex-col items-center justify-center text-center">
                <h1 className="text-2xl">Missing View: {location.pathname}</h1>
                <p className="opacity-50">
                    You shouldn&apos;t be seeing this, report this issue to the
                    developers!
                </p>
            </div>
            <Button as="link" to="/">
                Go Home
            </Button>
        </div>
    );
}
