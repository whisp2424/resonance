import type { Settings } from "@shared/schema/settings";
import type { SettingsPath } from "@shared/types/ipc";
import type { PathValue } from "@shared/types/utils";

import { useSettingsStore } from "@renderer/lib/state/settingsStore";
import { getDeep } from "@shared/utils/object";
import { useCallback } from "react";

export function useSetting<P extends SettingsPath>(path: P) {
    const settings = useSettingsStore((state) => state.settings);
    const update = useSettingsStore((state) => state.updateSetting);

    const value = settings
        ? (getDeep(
              settings as unknown as Record<string, unknown>,
              path,
          ) as PathValue<Settings, P>)
        : undefined;

    const setValue = useCallback(
        async (newValue: PathValue<Settings, P>) => {
            await update(path, newValue);
        },
        [path, update],
    );

    return [value, setValue] as const;
}
