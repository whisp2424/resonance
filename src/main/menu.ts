import { Menu } from "electron";

export const APP_MENU = Menu.buildFromTemplate([
    {
        label: "App",
        submenu: [{ role: "quit" }, { role: "close" }],
    },
    {
        label: "View",
        submenu: [
            { role: "reload" },
            { role: "forceReload" },
            { role: "toggleDevTools" },
            { role: "togglefullscreen" },
        ],
    },
]);
