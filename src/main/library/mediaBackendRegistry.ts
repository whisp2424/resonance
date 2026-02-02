import type { MediaBackend } from "@main/library/mediaBackend";

export class MediaBackendRegistry {
    private mediaBackends = new Map<string, MediaBackend>();

    register(Constructor: new () => MediaBackend): void {
        const instance = new Constructor();
        this.mediaBackends.set(instance.BACKEND_NAME, instance);
    }

    get(type: string): MediaBackend | undefined {
        return this.mediaBackends.get(type);
    }
}
