import type { Settings } from "@shared/schema/settings";
import type { SettingsPath } from "@shared/types/ipc";
import type { DeepPartial, PathValue } from "@shared/types/utils";

import { useIpcListener } from "@renderer/hooks/useIpcListener";
import { getErrorMessage, log } from "@shared/utils/logger";
import { deepMerge, setDeep } from "@shared/utils/object";
import { useCallback } from "react";
import { create } from "zustand";

interface SettingsState {
    settings: Settings | null;
    isLoading: boolean;
    error: string | null;
}

interface SettingsActions {
    loadSettings: () => Promise<void>;

    updateSetting: <P extends SettingsPath>(
        path: P,
        value: PathValue<Settings, P>,
    ) => Promise<void>;

    updateSettings: (partial: DeepPartial<Settings>) => Promise<void>;
}

export type SettingsStore = SettingsState & SettingsActions;

export const useSettingsStore = create<SettingsStore>((set) => ({
    settings: null,
    isLoading: true,
    error: null,

    loadSettings: async () => {
        set({ isLoading: true, error: null });

        try {
            const settings = await electron.invoke("settings:get");
            set({ settings, isLoading: false });
        } catch (err) {
            const errorMessage = getErrorMessage(err);

            set({
                error: errorMessage,
                isLoading: false,
            });

            log(errorMessage, "settingsStore", "error");
        }
    },

    updateSetting: async (path, value) => {
        const currentSettings = useSettingsStore.getState().settings;
        if (!currentSettings) return;

        const updated = setDeep(currentSettings, path, value) as Settings;
        set({ settings: updated });

        try {
            await electron.invoke("settings:setPath", path, value);
        } catch (err) {
            log(getErrorMessage(err), "settingsStore", "error");
            set({ settings: currentSettings });
        }
    },

    updateSettings: async (partial) => {
        const currentSettings = useSettingsStore.getState().settings;
        if (!currentSettings) return;

        const updated = deepMerge(currentSettings, partial) as Settings;
        set({ settings: updated });

        try {
            await electron.invoke("settings:set", partial);
        } catch (err) {
            log(getErrorMessage(err), "settingsStore", "error");
            set({ settings: currentSettings });
        }
    },
}));

export function useSettingsListeners(): void {
    useIpcListener(
        "settings:onChanged",
        useCallback((settings, changedKey) => {
            const currentSettings = useSettingsStore.getState().settings;

            if (changedKey && currentSettings) {
                useSettingsStore.setState({
                    settings: { ...currentSettings, ...settings },
                });
            } else {
                useSettingsStore.setState({ settings });
            }
        }, []),
    );

    useIpcListener(
        "settings:onError",
        useCallback((message) => {
            useSettingsStore.setState({ error: message });
        }, []),
    );
}
