# Agent Guidelines for Resonance

This document provides guidelines for AI agents working on the Resonance codebase.

## Project Overview

Resonance is an Electron application with React 19, TypeScript, and Tailwind CSS v4. It uses a multi-process architecture with separate codebases for `main`, `preload`, and `renderer` processes communicating via IPC.

### File Organization

```
.
├── build/              # Assets for Electron-builder and the main process
└── src/
    ├── main/           # Electron main process (Node.js)
    │   ├── index.ts    # Entry point
    │   ├── handlers/   # IPC handlers (exposed via contextBridge)
    │   └── types/      # TypeScript types
    ├── preload/        # Preload scripts (contextBridge)
    ├── renderer/       # React frontend
    │   ├── components/
    │   │   ├── ui/     # Reusable UI components
    │   │   └── views/  # Page views (routes)
    │   ├── contexts/   # React contexts
    │   ├── hooks/      # Custom hooks
    │   ├── constants/  # Constants
    │   ├── types/      # TypeScript types
    │   └── assets/     # Static assets
    ├── shared/         # Shared between processes
    └── types/          # Global types
```

## Naming Conventions

| Type                | Convention                                          | Example                             |
| ------------------- | --------------------------------------------------- | ----------------------------------- |
| Components          | PascalCase                                          | `HomeView`, `TitleBar`              |
| Functions/variables | camelCase                                           | `handleClick`, `isLoading`          |
| Constants           | SCREAMING_SNAKE_CASE                                | `MAX_RETRIES`                       |
| Types               | PascalCase                                          | `ButtonProps`, `IconElement`        |
| Files               | kebab-case for utilities, PascalCase for components | `use-current-view.ts`, `Button.tsx` |

### Build Commands

| Command             | Description                                      |
| ------------------- | ------------------------------------------------ |
| `pnpm dev`          | Start development server with hot reload         |
| `pnpm start`        | Preview production build                         |
| `pnpm build`        | Bundle app assets                                |
| `pnpm build:win`    | Build package for Windows (NSIS installer)       |
| `pnpm build:linux`  | Build package for Linux (tarball)                |
| `pnpm build:unpack` | Build unpacked directory (no installer)          |
| `pnpm check:node`   | Type-check main/preload code only                |
| `pnpm check:web`    | Type-check renderer code only                    |
| `pnpm check`        | Run TypeScript type checking (both node and web) |
| `pnpm lint`         | Run ESLint on entire codebase                    |
| `pnpm lint:fix`     | Auto-fix ESLint issues                           |
| `pnpm format`       | Format entire codebase with Prettier             |

## Key Configuration Files

| File                      | Purpose                                          |
| ------------------------- | ------------------------------------------------ |
| `package.json`            | Dependencies and pnpm scripts                    |
| `eslint.config.mjs`       | ESLint rules                                     |
| `.prettierrc`             | Prettier settings                                |
| `tsconfig.json`           | TypeScript project references                    |
| `tsconfig.node.json`      | Main/preload TypeScript config (Node.js globals) |
| `tsconfig.web.json`       | Renderer TypeScript config (DOM globals)         |
| `electron.vite.config.ts` | Vite/Electron-Vite configuration with aliases    |
| `src/renderer/styles.css` | Tailwind v4 imports and custom utilities         |

## Code Style Guidelines

### TypeScript

- Use **verbatim module syntax**: `import type` for type-only imports
- Enable **strict mode**: Always define proper types
- Avoid `any` type; use `unknown` or specific types instead
- Use absolute imports with path aliases (`@main/*`, `@renderer/*`, `@preload/*`, `@shared/*`)
- See `tsconfig.node.json` and `tsconfig.web.json` for process-specific settings

### Imports

Import order enforced by ESLint with these groups (in order):

1. `type` imports
2. `builtin` modules (Node.js built-ins like `node:path`)
3. `external` packages
4. `parent` directories (relative `../`)
5. `sibling` files (relative `./`)
6. `index` imports

Rules:

- Always use Node.js protocol: `import x from "node:path"` not `"path"`
- No duplicate imports: `import { a, b } from "module"` not separate lines
- Use consistent type specifier style
- Alphabetize within groups

### React

- Use React 19 hooks (`useState`, `useEffect`, `useCallback`, `useTransition`, etc.)
- Components: PascalCase for components, camelCase for functions
- Props: Type each component's props explicitly with interface
- Event handlers: Prefix with `on` (e.g., `onClick`, `onChange`, `onSubmit`)

### Styling (Tailwind CSS v4)

- Use utility classes directly in JSX
- Combine classes with `clsx` and `twMerge`
- Custom utilities defined in `src/renderer/styles.css` with `@utility`
- 4-space indentation for Prettier

### Linting & Fixing Policy

- **NEVER run `pnpm lint` without `--fix`.** Always use `pnpm lint:fix`.
- This is an absolute rule. There are no exceptions for "just checking" or "reviewing output".
- If you need to see lint errors, run `pnpm lint:fix` and the output will still be displayed.
- Only perform manual fixes after attempting `pnpm lint:fix` has been run.
- Never ask for permission to run the linter without `--fix`; just run `pnpm lint:fix` directly.
