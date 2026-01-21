import { Store } from "@main/store";
import { type } from "arktype";

const windowStateSchema = type({
    "[string]": type({
        "y?": "number",
        "x?": "number",
        "width?": "number",
        "height?": "number",
        "isMaximized?": "boolean",
        "isFullscreen?": "boolean",
    }),
});

type WindowState = typeof windowStateSchema.infer;

const store = new Store<WindowState>({
    filename: "window-state.json",
    defaults: {},
    encode: (data: WindowState) => JSON.stringify(data, null, 0),
    decode: (data: unknown) => {
        const result = windowStateSchema(data);
        if (result instanceof type.errors) return {};
        return result as WindowState;
    },
});

export const updateWindowState = (
    id: string,
    state: Partial<WindowState[string]>,
): void => {
    const oldState = store.get(id) ?? {};
    const newState =
        state.isFullscreen === true || state.isMaximized === true
            ? {
                  ...oldState,
                  ...state,
                  x: oldState.x,
                  y: oldState.y,
                  width: oldState.width,
                  height: oldState.height,
              }
            : {
                  ...oldState,
                  ...state,
              };

    store.set(id, newState);
};
export const getWindowState = (id: string): WindowState[string] | undefined => {
    return store.get(id);
};
