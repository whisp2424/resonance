import App from "@renderer/App";
import { SettingsProvider } from "@renderer/providers/SettingsProvider";
import { queryClient } from "@renderer/state/queryClient";
import "@renderer/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <HashRouter>
            <QueryClientProvider client={queryClient}>
                <SettingsProvider>
                    <App />
                </SettingsProvider>
            </QueryClientProvider>
        </HashRouter>
    </StrictMode>,
);
