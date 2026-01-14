// Route path constants
export const ROUTES = {
    HOME: "/",
    NOT_FOUND: "*",
} as const;

// Route configuration for programmatic access
export const routeConfig = [
    {
        path: ROUTES.HOME,
        component: "HomeView",
    },
    {
        path: ROUTES.NOT_FOUND,
        component: "NotFound",
    },
] as const;
