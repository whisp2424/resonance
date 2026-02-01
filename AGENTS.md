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

---

## File Organization

```
.
├── build/              # Assets for Electron-builder and the main process
├── drizzle/            # Database migrations (Drizzle ORM)
└── src/
    ├── main/               # Electron main process (Node.js)
    │   ├── database/       # Database layer (Drizzle ORM)
    │   │   ├── index.ts    # Database initialization
    │   │   └── schema.ts   # Database schema definitions
    │   ├── ipc/            # IPC implementation
    │   │   ├── app.ts      # App lifecycle handlers
    │   │   ├── dev.ts      # Developer mode handlers
    │   │   ├── dialog.ts   # Dialog handlers
    │   │   ├── library.ts  # Library management handlers
    │   │   ├── settings.ts # Settings handlers
    │   │   ├── system.ts   # System handlers
    │   │   └── window.ts   # Window management handlers
    │   ├── library/        # Library management
    │   │   ├── libraryManager.ts       # Core library logic
    │   │   ├── mediaSourceRegistry.ts  # Source registration
    │   │   └── sources/    # Media source implementations
    │   │       └── local.ts            # Local file source
    │   ├── window/         # Window management logic
    │   │   ├── validateBounds.ts       # Window bounds validation
    │   │   ├── windowManager.ts        # Window manager
    │   │   └── windowPolicies.ts       # Window behavior policies
    │   ├── index.ts        # Main process entry point
    │   ├── menu.ts         # Application menu
    │   ├── settings.ts     # Settings management logic
    │   └── windowState.ts  # Window state persistence
    ├── preload/            # Preload scripts (bridge)
    │   └── index.ts        # Preload script entry point
    ├── renderer/           # React frontend
    │   ├── assets/         # Static assets
    │   ├── components/     # UI components
    │   │   ├── layout/     # Layout components (TitleBar, etc.)
    │   │   ├── settings/   # Settings components
    │   │   │   └── developer/  # Developer settings (DatabaseDebug, DialogTesting)
    │   │   ├── ui/         # UI primitives (Button, Field, Input, Select, SideBar)
    │   │   └── views/      # View components (Home, Settings, AddSource, etc.)
    │   ├── constants/      # Frontend constants
    │   ├── contexts/       # React contexts (SettingsContext)
    │   ├── hooks/          # Custom React hooks
    │   ├── providers/      # React providers (SettingsProvider)
    │   ├── types/          # Frontend-specific types
    │   ├── App.tsx         # Root React component
    │   ├── main.tsx        # Renderer entry point
    │   └── styles.css      # Tailwind v4 entry point
    └── shared/             # Shared across all processes
        ├── constants/      # Cross-process constants (routes, sources)
        ├── schema/         # ArkType schemas (settings validation)
        ├── types/          # Cross-process TypeScript types
        │   ├── dialog.ts   # Dialog types
        │   ├── ipc.ts      # IPC channel definitions
        │   ├── library.ts  # Library types
        │   └── utils.ts    # Utility types
        └── utils/          # Shared utilities
            ├── logger.ts   # Shared logging utility
            └── object.ts   # Object manipulation utilities
```

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
  Example: `import path from "node:path"`

---

### React (v19)

- Use functional components and React 19 hooks.
- Component names: **PascalCase**
- Functions and variables: **camelCase**
- Props must be explicitly typed using `interface` or `type`.
- Event handlers must be prefixed with `on` (e.g., `onClick`, `onChange`).

---

### Styling (Tailwind CSS v4)

- Prefer utility classes directly in JSX.
- Conditional classes:
    - Use `clsx`
    - Merge with `twMerge`
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

## Common Patterns & Best Practices

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

### Dev Mode Detection

- Use `is.dev` from `@electron-toolkit/utils`.
- Import:
    ```ts
    import { is } from "@electron-toolkit/utils";
    ```
- Example:
    ```ts
    if (!is.dev) throw new Error("Developer tools only available in dev mode");
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
