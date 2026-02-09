import type { TabType, TabTypeDefinition } from "@renderer/tabs/types";

class TabRegistry {
    private types = new Map<string, TabTypeDefinition>();

    register<TParams extends Record<string, unknown>>(
        definition: TabType<TParams>,
    ): void {
        if (this.types.has(definition.type))
            throw new Error(`tab type '${definition.type}' already registered`);
        this.types.set(definition.type, definition as TabTypeDefinition);
    }

    get(type: string): TabTypeDefinition | undefined {
        return this.types.get(type);
    }

    isSingleton(type: string): boolean {
        const definition = this.types.get(type);
        return definition?.singleton ?? false;
    }

    isPersistable(type: string): boolean {
        const definition = this.types.get(type);
        return definition?.persistable ?? false;
    }

    getAllTypes(): string[] {
        return Array.from(this.types.keys());
    }

    unregister(type: string): void {
        this.types.delete(type);
    }

    clear(): void {
        this.types.clear();
    }
}

export const tabRegistry = new TabRegistry();
