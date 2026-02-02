export interface LibraryMediaSource {
    id: number;
    backend: string;
    uri: string;
    displayName: string;
}

export type AddSourceResult =
    | { success: true; source: LibraryMediaSource }
    | {
          success: false;
          error: "duplicate" | "invalid" | "unknown";
          message?: string;
      };
