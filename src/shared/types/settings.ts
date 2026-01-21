export type AppTheme = "system" | "light" | "dark";
export type AppTrayIcon = "auto" | "white" | "dark";

export interface AppSettings {
    theme: AppTheme;
    trayIcon: AppTrayIcon;
}
