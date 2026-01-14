import { useContext } from "react";

import { ViewContext } from "@/contexts/ViewContextValue";

export function useCurrentView() {
    return useContext(ViewContext);
}
