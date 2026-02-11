import type { FieldError, FieldErrors } from "react-hook-form";

/**
 * Transforms react-hook-form FieldErrors into a format compatible with
 * BaseUI's form component
 */
export function baseUiFormErrors<T extends Record<string, unknown>>(
    errors: FieldErrors<T>,
): Record<string, string | string[]> {
    const result: Record<string, string | string[]> = {};

    for (const [key, error] of Object.entries(errors)) {
        if (error && typeof error === "object" && "message" in error) {
            const message = (error as FieldError).message;
            if (message) result[key] = message;
        }
    }

    return result;
}
