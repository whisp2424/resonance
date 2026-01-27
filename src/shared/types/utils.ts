export type PathInto<T> =
    T extends Record<string, unknown>
        ? {
              [K in keyof T]: K extends string
                  ? T[K] extends Record<string, unknown>
                      ? `${K}` | `${K}.${PathInto<T[K]>}`
                      : `${K}`
                  : never;
          }[keyof T]
        : never;

export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
    ? K extends keyof T
        ? PathValue<T[K], R>
        : unknown
    : P extends keyof T
      ? T[P]
      : unknown;

export type DeepPartial<T> = T extends object
    ? {
          [P in keyof T]?: DeepPartial<T[P]>;
      }
    : T;
