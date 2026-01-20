import _Store from "electron-store";

// @ts-expect-error - https://github.com/sindresorhus/electron-store/issues/289#issuecomment-2899942966
export const Store: typeof _Store = _Store.default || _Store;
