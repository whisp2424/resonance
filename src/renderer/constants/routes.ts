export const ROUTES = {
    HOME: "/",
    NOT_FOUND: "*",
} as const;

export const routeConfig: { path: string; title?: string }[] = [
    { path: ROUTES.HOME, title: "Home" },
    { path: ROUTES.NOT_FOUND },
] as const;
