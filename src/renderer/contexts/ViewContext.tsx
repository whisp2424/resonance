import { useLocation } from "react-router-dom";

import { ViewContext } from "@/contexts/ViewContextValue";

export function ViewProvider({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    return (
        <ViewContext.Provider value={location.pathname}>
            {children}
        </ViewContext.Provider>
    );
}
