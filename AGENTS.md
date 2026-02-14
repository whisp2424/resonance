# Agent Guidelines for Resonance

This document provides guidelines for AI agents working on the Resonance codebase. Resonance is a modern Electron application built with React 19, TypeScript, and Tailwind CSS v4.

These rules are intentionally opinionated. Follow them strictly to ensure consistency, safety, and long-term maintainability of the codebase.

---

## Project Overview

Resonance uses a multi-process Electron architecture with **separate codebases** for:

- `main` – Node.js environment, system access
- `preload` – secure, minimal IPC bridge
- `renderer` – React frontend

Processes communicate **only** via typed IPC.

### Terminology

- **Media Backend**: Implementation classes that handle different media source types (e.g., `LocalMediaBackend`)
- **Media Source**: Database entries representing actual sources with URIs and backend types

---

## File Organization

**Only directories are shown here. Do not list individual files in this tree.**

```
.
├── build/              # Assets for Electron-builder and the main process
├── drizzle/            # Database migrations (Drizzle ORM)
└── src/
    ├── main/               # Electron main process (Node.js)
    │   ├── database/       # Database layer (Drizzle ORM)
    │   ├── ipc/            # IPC implementation
    │   ├── library/        # Library management
    │   ├── utils/          # Main process utilities
    │   └── window/         # Window management logic
    ├── preload/            # Preload scripts (bridge)
    ├── renderer/           # React frontend
    │   ├── assets/         # Static assets
    │   ├── components/     # UI components
    │   │   ├── layout/     # Layout components
    │   │   │   └── titlebar/   # TitleBar component and related hooks
    │   │   ├── providers/  # React providers
    │   │   ├── settings/   # Settings components
    │   │   │   └── developer/  # Developer settings
    │   │   ├── ui/         # UI primitives
    │   │   └── views/      # View components
    │   ├── hooks/          # Custom React hooks
    │   │   ├── library/    # Library-related hooks
    │   │   ├── settings/   # Settings-related hooks
    │   │   ├── theme/      # Theme-related hooks
    │   │   └── *.ts        # Other hooks (dialog, OS, shortcuts)
    │   └── lib/            # Library code (state, types, utils)
    │       ├── state/      # Zustand stores and TanStack Query client
    │       ├── types/      # Frontend-specific types
    │       └── utils/      # Renderer utilities
    └── shared/             # Shared across all processes
        ├── constants/      # Cross-process constants
        ├── schema/         # ArkType schemas
        ├── types/          # Cross-process TypeScript types
        └── utils/          # Shared utilities
```

### Keeping This Documentation Updated

**When creating, deleting, moving, or renaming files/folders that affect the project structure, you MUST update this File Organization section.**

- **After any structural change**, review the File Organization tree above
- **Update the tree** to reflect the new structure
- **Update folder descriptions** if their purpose changes
- **Add new folders** with appropriate descriptions
- **Remove deleted folders** from the tree. **This is not optional** future agents rely on this documentation to understand the codebase

---

## Build and Development Commands

| Command         | Description                                   |
| --------------- | --------------------------------------------- |
| `pnpm dev`      | Start development server with hot reload      |
| `pnpm start`    | Preview production build                      |
| `pnpm build`    | Bundle app assets                             |
| `pnpm fix`      | **RECOMMENDED**: Runs `lint:fix` and `format` |
| `pnpm check`    | Run TypeScript type checking (node and web)   |
| `pnpm lint:fix` | Auto-fix ESLint issues (**MANDATORY**)        |
| `pnpm format`   | Format entire codebase with Prettier          |

---

## Coding Standards

### TypeScript & Types

- **Strict Mode**: Always define proper types; avoid `any`.
- Use `unknown` for uncertain types and narrow them safely.
- **Module Syntax**: Use `import type` for type-only imports.
- **No Type Casting**:
    - **DO NOT** use `as` or `as unknown as` to bypass type errors.
    - Fix the underlying type or schema instead.
    - If casting is _truly unavoidable_ (e.g., incorrect upstream Electron typings), keep it narrowly scoped and document or explain **why** the cast is required.

---

### Imports

- **ALWAYS use import aliases over relative imports**
    - `@main/*`, `@renderer/*`, `@preload/*`, `@shared/*`
- **NEVER** use `../` or `./` when an alias exists.
- **Order**: Enforced by ESLint (Types → Builtins → External → Internal).
- **Node Protocol**: Always use `node:` prefix
  Example: `import path from "node:"`
- **No Namespace Imports**: Avoid namespace imports like `import * as React from 'react'` or `React.useState`.
    - Prefer named imports: `import { useState } from 'react'`

---

### Functions and Style

- **Named Functions by Default**:
    - Use named functions (`function myFunction() {}`) over arrow functions.
    - (`const myFunction = () => {}`) for standalone/declared functions.
- **Keep Arrow Functions For**:
    - Inline functions in JSX (e.g., `onClick={() => handleClick()}`)
    - Callbacks passed as arguments (e.g., `array.map(item => item.value)`)
    - One-liners that are clearly meant to be inline
    - Class methods (if applicable)
- **Convert to Named Functions When**:
    - The function is assigned to a variable/constant
    - The function is reusable or exported
    - The function has multiple statements
    - The function would benefit from better stack traces for debugging

---

### Styling (Tailwind CSS v4)

- **ALWAYS use `clsx`** for className strings, never use plain template literals or string concatenation.
- Conditional classes:
    - Use `clsx` to handle all conditional class logic
    - Merge with `twMerge` when className is exposed as a prop
- Custom CSS belongs in `src/renderer/styles.css` using `@utility`.
- **Size utilities**:
    - **AVOID** using `h-* w-*` with the same value
    - Prefer `size-*` (e.g., `size-4`)

---

## IPC Communication (typed-ipc)

- Uses `@electron-toolkit/typed-ipc` for end-to-end type safety.
- **Preload constraint**:
    - **NEVER** add wrapper or helper methods in `src/preload/index.ts`.
- **Renderer**:
    - `window.electron.invoke(channel, ...args)`
    - `window.electron.send(channel, listener)`
- **Main**:
    - New IPC channels **must**:
        1. Be defined in `src/shared/types/ipc.ts`
        2. Be implemented in `src/main/ipc/`

---

## State Management

Resonance uses two complementary approaches based on data characteristics. Both settings and library data come from the main process (via IPC), but we handle them differently based on their access patterns.

### State Management

Located in `src/renderer/lib/state/`:

**Zustand Stores:**

- **`settingsStore.ts`** – Application settings state (small, frequently read, UI-critical)
- **`tabsStore.ts`** – Tab state management
- **`themeStore.ts`** – Theme and accent color state

**TanStack Query:**

- **`queryClient.ts`** – Query client configuration for library data (large, queryable, view-specific)

### Usage Patterns

**Zustand (Immediate State):**

Use for small, configuration-like data that's needed immediately across the app:

```ts
import { useSettingsStore } from "@renderer/lib/state/settingsStore";

// Reading state - synchronous, no loading states
const settings = useSettingsStore((state) => state.settings);

// Updating state - optimistic updates with automatic sync
await useSettingsStore.getState().updateSetting("appearance.theme", "dark");
```

**TanStack Query (Async Data):**

Use for larger, queryable datasets fetched on-demand:

```ts
import { useSources, useAddSource } from "@renderer/hooks/library/useSources";

// Reading data - async with loading/error states
const { data: sources, isLoading } = useSources();

// Mutations with automatic cache invalidation
const addSource = useAddSource();
await addSource.mutateAsync({ uri: "/path", backend: "local" });
```

**Error Handling with Result Types:**

```ts
import type { AddSourceResult } from "@shared/types/library";

// Mutations return typed Result objects
const result: AddSourceResult = await addSource.mutateAsync({...});

if (!result.success) {
  // Handle typed error: "duplicate" | "invalid" | "unknown"
  console.error(result.error, result.message);
}
```

**Key principles:**

- **Zustand**: UI state, themes, settings - small data needed immediately (synchronous access)
- **TanStack Query**: Library content - large, queryable datasets (cached, async access)
- **Main Process**: Both settings (JSON) and library (SQLite) are managed by the main process
- Keep stores small and focused on a single domain
- Use selectors to prevent unnecessary re-renders

---

## Common Patterns & Best Practices

### Loading States & UX

**Avoid spinners and loading indicators for fast operations.** Small delays of no content are preferred over showing a spinner for a split second.

**Loading State Guidelines:**

**Avoid loaders for short operations.** Small delays of no content are preferred over showing a spinner for a split second.

1. **Initial Data Load (Queries):**
    - Show the container structure (border, padding, background) immediately
    - Render empty space or `null` for content while loading
    - Do NOT show spinners, progress bars, or "Loading..." text
    - Example:

        ```tsx
        const { data: sources, isLoading } = useSources();

        if (isLoading) {
            return <div className="border p-6">{/* Empty container */}</div>;
        }
        ```

2. **Mutations (Add/Update/Remove):**
    - Disable buttons during the operation (`disabled={mutation.isPending}`)
    - Do NOT show spinners or loading text
    - Button text should remain static (e.g., "Remove", not "Removing...")
    - Handle errors with dialogs or inline messages after completion

**Rationale:** Spinners that flash briefly create visual noise and make the app feel slower than it actually is. Users prefer a brief moment of empty space over jarring loading animations.

---

### Window Management

- Use `windowManager` in the main process.
- Window behavior (resizable, closable, etc.) is defined in:
    - `src/main/window/windowPolicies.ts`

---

### Icon Usage

- Icons are handled via `unplugin-icons`.
- Import format:
    ```ts
    import IconName from "~icons/lucide/icon-name";
    ```

---

### Logging

- **Avoid** using `console.*` directly.
- Use the shared logger:
    ```ts
    import { log } from "@shared/utils/logger";
    log("Message", "category", "info");
    ```
- Renderer logs are forwarded to the main process automatically.
- Severity levels:
    - `"info"` (default)
    - `"warning"`
    - `"error"`

---

## Common Mistakes to Avoid

- Adding IPC channels without updating `src/shared/types/ipc.ts`
- Implementing IPC logic in the preload layer
- Using relative imports instead of aliases
- Using type casting to silence type errors
- Duplicating types instead of sharing them via `src/shared`
- Using `h-* w-*` instead of `size-*` in Tailwind
- Manually checking `instanceof Error` to get error messages
    - **Use `getErrorMessage()`** from `@shared/utils/logger` instead:

        ```ts
        import { getErrorMessage } from "@shared/utils/logger";

        // DON'T do this:
        const message = err instanceof Error ? err.message : String(err);

        // DO this:
        const message = getErrorMessage(err);
        ```

---

## Agent Workflow Policy

1. **Understand First**
    - Use `grep` and `glob` to study existing patterns before editing.

2. **Linter Rule**
    - **NEVER** run `pnpm lint`
    - Always use `pnpm lint:fix`

3. **Documentation-Only Changes**
    - If updating only `.md`, `.txt`, or non-code config files:
        - **SKIP** `pnpm fix` and `pnpm check`

4. **Verification**
    - After code changes, run:
        - `pnpm check`
        - `pnpm fix`
