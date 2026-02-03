import type { ShortcutInfo } from "@shared/types/shortcut";

export interface Shortcut extends ShortcutInfo {
    callback: () => void;
}
