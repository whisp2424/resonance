import { Store } from "@main/store";

export interface WindowState {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    isMaximized?: boolean;
    isFullscreen?: boolean;
}

const schema = {
    additionalProperties: {
        type: "object",
        additionalProperties: false,
        properties: {
            x: { type: "number" },
            y: { type: "number" },
            width: { type: "number" },
            height: { type: "number" },
            isMaximized: { type: "boolean" },
            isFullscreen: { type: "boolean" },
        },
    },
} as const;

const store = new Store<Record<string, WindowState>>({ schema });

export const updateWindowState = (
    id: string,
    state: Partial<WindowState>,
): void => {
    const oldState = store.get(id);
    const mergedState = {
        ...(oldState ?? {}),
        ...state,
    };

    if (mergedState.isMaximized || mergedState.isFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { x, y, width, height, ...newState } = state;
        store.set(id, {
            ...(oldState ?? {}),
            ...newState,
        });
    } else {
        store.set(id, {
            ...(oldState ?? {}),
            ...state,
        });
    }
};

export const getWindowState = (id: string): WindowState | undefined => {
    return store.get(id);
};
