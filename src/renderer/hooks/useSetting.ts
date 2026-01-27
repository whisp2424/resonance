import type { Settings } from "@shared/schema/settings";
import type { SettingsPath } from "@shared/types/ipc";
import type { PathValue } from "@shared/types/utils";

import { useSettings } from "@renderer/hooks/useSettings";
import { getDeep } from "@shared/utils/object";
import { useCallback } from "react";

export function useSetting<P extends SettingsPath>(path: P) {
    const [settings, , setSetting] = useSettings();
    const value = settings
        ? (getDeep(
              settings as unknown as Record<string, unknown>,
              path,
          ) as PathValue<Settings, P>)
        : undefined;

    const setValue = useCallback(
        (newValue: PathValue<Settings, P>) => {
            setSetting(path, newValue);
        },
        [path, setSetting],
    );

    return [value, setValue] as const;
}
