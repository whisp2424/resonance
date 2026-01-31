# Agent Guidelines for Resonance

This document provides guidelines for AI agents working on the Resonance codebase. Resonance is a modern Electron application built with React 19, TypeScript, and Tailwind CSS v4.

## Project Overview

Resonance uses a multi-process architecture with separate codebases for `main`, `preload`, and `renderer` processes communicating via IPC.

### File Organization

```
.
├── build/              # Assets for Electron-builder and the main process
└── src/
    ├── main/           # Electron main process (Node.js)
    │   ├── ipc/        # IPC implementation
    │   ├── utils/      # Main process utilities
    │   ├── window/     # Window management logic
    │   ├── index.ts    # Main process entry point
    │   └── settings.ts # Settings management logic
    ├── preload/        # Preload scripts (bridge)
    ├── renderer/       # React frontend
    │   ├── assets/     # Static assets
    │   ├── components/ # UI components (layout/, settings/, ui/, views/)
    │   ├── constants/  # Frontend constants
    │   ├── hooks/      # Custom React hooks
    │   ├── types/      # Frontend-specific types
    │   ├── App.tsx     # Root React component
    │   ├── main.tsx    # Renderer entry point
    │   └── styles.css  # Tailwind v4 entry point
    ├── shared/         # Shared across all processes
    │   ├── constants/  # Cross-process constants
    │   ├── schema/     # ArkType schemas (validation/inference)
    │   └── types/      # Cross-process TypeScript types
    └── types/          # Global type definitions
```

## Build and Development Commands

| Command         | Description                                    |
| --------------- | ---------------------------------------------- |
| `pnpm dev`      | Start development server with hot reload       |
| `pnpm start`    | Preview production build                       |
| `pnpm build`    | Bundle app assets                              |
| `pnpm fix`      | **RECOMMENDED**: Runs `lint:fix` and `format`  |
| `pnpm check`    | Run TypeScript type checking (node and web)    |
| `pnpm lint:fix` | Auto-fix ESLint issues (MANDATORY over `lint`) |
| `pnpm format`   | Format entire codebase with Prettier           |

## Coding Standards

### TypeScript & Types

- **Strict Mode**: Always define proper types; avoid `any`. Use `unknown` for uncertain types.
- **Absolute Imports**: Always use aliases: `@main/*`, `@renderer/*`, `@preload/*`, `@shared/*`.
- **Module Syntax**: Use `import type` for type-only imports.

### Imports & Formatting

- **Order**: Enforced by ESLint (Types -> Builtins -> External -> Internal).
- **Node Protocol**: Always use `node:` prefix (e.g., `import path from "node:path"`).
- **Style**: 4-space indentation, no semicolons (as per Prettier config).

### React (v19)

- **Hooks**: Use functional components and React 19 hooks.
- **Naming**: PascalCase for components, camelCase for functions and variables.
- **Props**: Explicitly type props with `interface` or `type`.
- **Event Handlers**: Prefix with `on` (e.g., `onClick`, `onChange`).

### Styling (Tailwind CSS v4)

- **Utilities**: Use utility classes directly in JSX.
- **Conditional Classes**: Use `clsx` and `twMerge` helpers.
- **Custom CSS**: Defined in `src/renderer/styles.css` with `@utility`.

## IPC Communication (typed-ipc)

- **Architecture**: This project uses `@electron-toolkit/typed-ipc` for type-safe communication.
- **Constraint**: **NEVER** add explicit wrapper methods in `src/preload/index.ts`.
- **Renderer**: Use `window.electron.invoke(channel, ...args)` and `window.electron.send(channel, listener)`.
- **Main**: New IPC methods must be added to `src/shared/types/ipc.ts` and implemented in `src/main/ipc/`.

## Common Patterns & Best Practices

### Window Management

- Use `windowManager` in the main process for opening and toggling windows.
- Window policies (resizable, closable, etc.) are defined in `src/main/window/windowPolicies.ts`.

### Icon Usage

- Icons are handled via `unplugin-icons`.
- Use the following syntax: `import IconName from '~icons/lucide/icon-name'`.

### Dev Mode Detection

- Use `is.dev` from `@electron-toolkit/utils` to check if app is running in development mode.
- Import it in the main process: `import { is } from "@electron-toolkit/utils"`.
- Example: `if (!is.dev) throw new Error("Developer tools only available in dev mode");`

### Logging

- **Avoid** using `console.*` methods directly where possible.
- Use the `log` utility from `@shared/utils/logger` instead.
- This provides consistent formatting across main and renderer processes with timestamps, severity levels, and color-coded output.
- **Main process**: `import { log } from "@shared/utils/logger"; log("Message", "category", "info");`
- **Renderer process**: Automatically forwards logs to main process via IPC for centralized logging.
- **Severity levels**: `"info"` (default), `"warning"`, `"error"`.

## Agent Workflow Policy

1. **Understand First**: Use `grep` and `glob` to explore patterns before editing.
2. **Linter Rule**: NEVER run `pnpm lint`. Always use `pnpm lint:fix`. No exceptions.
3. **Verification**: After changes, run `pnpm check` and `pnpm fix` to ensure quality.
