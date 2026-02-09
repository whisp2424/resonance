import { type } from "arktype";

export const persistedTabSchema = type({
    id: "string",
    type: "string",
    params: "object",
});

export const tabStateSchema = type({
    tabs: persistedTabSchema.array(),
    activeId: "string | null",
});

export type PersistedTab = typeof persistedTabSchema.infer;
export type TabState = typeof tabStateSchema.infer;
