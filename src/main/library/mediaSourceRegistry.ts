export abstract class MediaBackend {
    abstract readonly BACKEND_NAME: string;

    abstract parseName(uri: string): string;
}

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
