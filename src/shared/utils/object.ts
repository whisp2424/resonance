/**
 * Get a value from an object using a dot-separated path.
 *
 * If the path does not exist, returns `undefined`.
 *
 * @example
 * getDeep({ a: { b: 1 } }, "a.b") // 1
 * getDeep({ a: { b: 1 } }, "a.c") // undefined
 */
export function getDeep(
    object: Record<string, unknown>,
    path: string,
): unknown {
    return path.split(".").reduce((acc: unknown, part) => {
        if (acc && typeof acc === "object" && part in acc) {
            return (acc as Record<string, unknown>)[part];
        }
        return undefined;
    }, object);
}

/**
 * Return a new object with a value set at a dot-separated path.
 *
 * The original object is not modified.
 * Missing objects along the path are created automatically.
 *
 * @example
 * setDeep({ a: { b: 1 } }, "a.c", 2) // { a: { b: 1, c: 2 } }
 */
export function setDeep(
    object: Record<string, unknown>,
    path: string,
    value: unknown,
): Record<string, unknown> {
    const parts = path.split(".");
    const lastPart = parts.pop()!;
    const newObj = { ...object };
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
 * Deeply merge two objects.
 *
 * Values from `source` override values in `target`.
 * Objects are merged recursively; everything else is replaced.
 *
 * @example
 * deepMerge(
 *   { a: 1, b: { x: 1 } },
 *   { b: { y: 2 } }
 * ) // { a: 1, b: { x: 1, y: 2 } }
 */
export function deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
): Record<string, unknown> {
    const isObject = (object: unknown): object is Record<string, unknown> =>
        object !== null && typeof object === "object" && !Array.isArray(object);

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
