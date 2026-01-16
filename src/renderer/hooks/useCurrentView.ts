import { ViewContext } from "@renderer/contexts/ViewContextValue";
import { useContext } from "react";


export function useCurrentView() {
    return useContext(ViewContext);
}
