import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSources() {
    return useQuery({
        queryKey: ["library", "sources"],
        queryFn: async () => {
            const sources = await electron.invoke("library:getSources");
            return sources;
        },
    });
}

export function useAddSource() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ path, name }: { path: string; name?: string }) => {
            const result = await electron.invoke(
                "library:addSource",
                path,
                name,
            );

            return result;
        },

        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["library", "sources"],
            });
        },
    });
}

export function useRemoveSource() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ path }: { path: string }) => {
            const result = await electron.invoke("library:removeSource", path);

            return result;
        },

        onSuccess: () => {
            void queryClient.invalidateQueries({
                queryKey: ["library", "sources"],
            });
        },
    });
}
