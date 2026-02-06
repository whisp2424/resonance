import App from "@renderer/App";
import { SettingsProvider } from "@renderer/providers/SettingsProvider";
import "@renderer/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <HashRouter>
            <SettingsProvider>
                <App />
            </SettingsProvider>
        </HashRouter>
    </StrictMode>,
);
