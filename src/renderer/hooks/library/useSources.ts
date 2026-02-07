import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSources(type?: string) {
    return useQuery({
        queryKey: ["library", "sources", type],
        queryFn: async () => {
            const sources = await electron.invoke("library:getSources", type);
            return sources;
        },
    });
}

export function useAddSource() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            uri,
            backend,
            name,
        }: {
            uri: string;
            backend: string;
            name?: string;
        }) => {
            const result = await electron.invoke(
                "library:addSource",
                uri,
                backend,
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
        mutationFn: async ({
            uri,
            backend,
        }: {
            uri: string;
            backend: string;
        }) => {
            const result = await electron.invoke(
                "library:removeSource",
                uri,
                backend,
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
