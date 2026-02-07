import type { MediaBackend } from "@shared/constants/mediaBackends";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useSources(type?: MediaBackend) {
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
            backend: MediaBackend;
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
            backend: MediaBackend;
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
