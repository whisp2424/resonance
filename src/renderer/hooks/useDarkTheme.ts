import { useSyncExternalStore } from "react";

function subscribe(callback: () => void) {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    query.addEventListener("change", callback);
    return () => query.removeEventListener("change", callback);
}

function getSnapshot() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useDarkTheme() {
    return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
