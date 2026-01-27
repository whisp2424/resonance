import type { Settings } from "@shared/schema/settings";
import type { SettingsPath } from "@shared/types/ipc";
import type { DeepPartial, PathValue } from "@shared/types/utils";

import { createContext, useContext } from "react";

export interface SettingsContextValue {
    settings: Settings | null;
    updateSettings: (partial: DeepPartial<Settings>) => Promise<void>;
    setSetting: <P extends SettingsPath>(
        path: P,
        value: PathValue<Settings, P>,
    ) => Promise<void>;
}

export const SettingsContext = createContext<SettingsContextValue | undefined>(
    undefined,
);

export function useSettingsContext() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error(
            "useSettingsContext must be used within a SettingsProvider",
        );
    }
    return context;
}
