import path from "node:path";

import { MediaBackend } from "@main/library/mediaSourceRegistry";

export class LocalMediaBackend extends MediaBackend {
    readonly BACKEND_NAME = "local";

    parseName(uri: string): string {
        return path.basename(uri);
    }
}
