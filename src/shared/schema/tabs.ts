import { type } from "arktype";

export const tabParamsSchema = type({
    "[string]": "unknown",
});

export const tabHistoryEntrySchema = type({
    type: "string",
    params: tabParamsSchema,
});

export const tabDescriptorSchema = type({
    id: "string",
    type: "string",
    params: tabParamsSchema,
    title: "string",
    history: tabHistoryEntrySchema.array(),
    historyIndex: "number",
});

export const closedTabEntrySchema = type({
    tab: tabDescriptorSchema,
    closedAt: "number",
    index: "number",
});
