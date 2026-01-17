export const ROUTES = {
    NOT_FOUND: "*",
    HOME: "/",
    SETTINGS: "/settings",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
