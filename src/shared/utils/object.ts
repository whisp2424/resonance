/**
 * Gets a value from an object by a dot-separated path.
 */
export function getDeep(obj: Record<string, unknown>, path: string): unknown {
    return path.split(".").reduce((acc: unknown, part) => {
        if (acc && typeof acc === "object" && part in acc) {
            return (acc as Record<string, unknown>)[part];
        }
        return undefined;
    }, obj);
}

/**
 * Sets a value in an object by a dot-separated path.
 * Returns a new object with the value set, preserving the original.
 */
export function setDeep(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
): Record<string, unknown> {
    const parts = path.split(".");
    const lastPart = parts.pop()!;
    const newObj = { ...obj };
    let current = newObj;

    for (const part of parts) {
        const next = current[part];
        const nextIsObject =
            next && typeof next === "object" && !Array.isArray(next);
        const nextClone = nextIsObject
            ? { ...(next as Record<string, unknown>) }
            : {};

        current[part] = nextClone;
        current = nextClone;
    }

    current[lastPart] = value;
    return newObj;
}

/**
 * Deep merges two objects.
 */
export function deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): Record<string, unknown> {
    const isObject = (obj: unknown): obj is Record<string, unknown> =>
        obj !== null && typeof obj === "object" && !Array.isArray(obj);

    const result = { ...target };

    for (const key of Object.keys(source)) {
        const targetValue = target[key];
        const sourceValue = source[key];

        if (isObject(targetValue) && isObject(sourceValue)) {
            result[key] = deepMerge(targetValue, sourceValue);
        } else {
            result[key] = sourceValue;
        }
    }

    return result;
}
