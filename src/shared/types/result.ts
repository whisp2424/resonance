export type Ok<T> = { success: true; data: T };
export type Err<E> = { success: false; error: E; message?: string };

export type Result<T, E = string> = Ok<T> | Err<E>;

export function ok<T>(data: T): Ok<T> {
    return { success: true, data };
}

export function error<E>(error: E, message?: string): Err<E> {
    return { success: false, error, message };
}
