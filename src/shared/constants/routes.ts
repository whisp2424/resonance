export const ROUTES = {
    NOT_FOUND: "*",
    HOME: "/",
    SETTINGS: "/settings",
    ADD_SOURCE: "/add-source",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
export type WindowRoute = Exclude<Route, "/" | "*">;
