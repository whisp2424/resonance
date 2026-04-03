export const ROUTES = {
    NOT_FOUND: "*",
    HOME: "/",
    ADD_SOURCE: "/add-source",
    AUDIO_INFO: "/audio-info",
} as const;

export type Route = (typeof ROUTES)[keyof typeof ROUTES];
export type WindowRoute = Exclude<Route, "/" | "*">;
