import { useQuery } from "@tanstack/react-query";

interface OperatingSystem {
    isWindows: boolean;
    isMac: boolean;
    isLinux: boolean;
    name: "windows" | "mac" | "linux" | "unknown";
}

export function useOperatingSystem() {
    return useQuery<OperatingSystem>({
        staleTime: Infinity,
        queryKey: ["system", "os"],
        queryFn: async () => {
            const [isWindows, isMac, isLinux] = await Promise.all([
                electron.invoke("system:isWindows"),
                electron.invoke("system:isMac"),
                electron.invoke("system:isLinux"),
            ]);

            let name: OperatingSystem["name"] = "unknown";
            if (isWindows) name = "windows";
            else if (isMac) name = "mac";
            else if (isLinux) name = "linux";

            return { isWindows, isMac, isLinux, name };
        },
    });
}
