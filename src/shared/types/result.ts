export type Ok<T> = { success: true; data: T };
export type Err<E> = { success: false; error: E; message: string };

export type Result<T, E extends string = never> = Ok<T> | Err<E | "unknown">;

export function ok<T>(data: T): Ok<T> {
    return { success: true, data };
}

export function error<E extends string>(
    message: string,
    code?: E,
): Err<E | "unknown"> {
    return { success: false, error: code ?? "unknown", message };
}
