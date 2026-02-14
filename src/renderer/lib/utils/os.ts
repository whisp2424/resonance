export type OperatingSystem = "windows" | "mac" | "linux";

export function getOperatingSystem(): OperatingSystem {
    const os = document.documentElement.dataset.os;
    if (os === "windows" || os === "mac" || os === "linux") return os;
    return "linux";
}

export function isWindows(): boolean {
    return getOperatingSystem() === "windows";
}

export function isMac(): boolean {
    return getOperatingSystem() === "mac";
}

export function isLinux(): boolean {
    return getOperatingSystem() === "linux";
}
