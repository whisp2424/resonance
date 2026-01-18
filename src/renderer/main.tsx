import App from "@renderer/App";
import { ViewProvider } from "@renderer/contexts/ViewContext";
import "@renderer/styles.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <HashRouter>
            <ViewProvider>
                <App />
            </ViewProvider>
        </HashRouter>
    </StrictMode>,
);
