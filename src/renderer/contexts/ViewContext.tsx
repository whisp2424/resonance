import { ViewContext } from "@renderer/contexts/ViewContextValue";
import { useLocation } from "react-router-dom";


export function ViewProvider({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    return (
        <ViewContext.Provider value={location.pathname}>
            {children}
        </ViewContext.Provider>
    );
}
