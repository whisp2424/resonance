# Agent Guidelines for Resonance

This document provides guidelines for AI agents working on the Resonance codebase.

## Project Overview

Resonance is an Electron application with React, TypeScript, and Tailwind CSS. It uses a multi-process architecture with separate codebases for `main`, `preload`, and `renderer` processes.

## Build Commands

| Command            | Description                                      |
| ------------------ | ------------------------------------------------ |
| `pnpm dev`         | Start development server                         |
| `pnpm build`       | Build app for current platform                   |
| `pnpm build:win`   | Build for Windows                                |
| `pnpm build:linux` | Build for Linux                                  |
| `pnpm build:dir`   | Build unpacked directory                         |
| `pnpm start`       | Preview production build                         |
| `pnpm check`       | Run TypeScript type checking (both node and web) |
| `pnpm check:node`  | Type-check main/preload code                     |
| `pnpm check:web`   | Type-check renderer code                         |
| `pnpm lint`        | Run ESLint on entire codebase                    |
| `pnpm lint:fix`    | Auto-fix ESLint issues                           |
| `pnpm format`      | Format entire codebase with Prettier             |

## Code Style Guidelines

### TypeScript

- Use **verbatim module syntax**: `import type` for type-only imports
- Enable **strict mode**: Always define proper types
- Avoid `any` type; use `unknown` or specific types instead
- Use absolute imports with path aliases (`@main/*`, `@renderer/*`, `@preload/*`)

### Imports

Import order follows ESLint rules with these groups:

1. `type` imports
2. `builtin` modules (Node.js built-ins like `node:path`)
3. `external` packages
4. `parent` directories (relative `../`)
5. `sibling` files (relative `./`)
6. `index` imports

Always use Node.js protocol for built-ins: `import x from "node:path"` not `"path"`.

**No duplicate imports**: Use `import { a, b } from "module"` not separate lines.

### React

- Use React 19 hooks (`useState`, `useEffect`, `useCallback`, etc.)
- Components: PascalCase for components, camelCase for functions
- Props: Type each component's props explicitly
- Event handlers: Prefix with `on` (e.g., `onClick`, `onChange`)

### Styling (Tailwind CSS v4)

- Use utility classes directly in JSX
- Combine classes with `clsx` and `twMerge`
- Custom utilities defined in `src/renderer/styles.css` with `@utility`

### Naming Conventions

| Type                | Convention                                          | Example                             |
| ------------------- | --------------------------------------------------- | ----------------------------------- |
| Components          | PascalCase                                          | `HomeView`, `TitleBar`              |
| Functions/variables | camelCase                                           | `handleClick`, `isLoading`          |
| Constants           | SCREAMING_SNAKE_CASE                                | `MAX_RETRIES`                       |
| Types               | PascalCase                                          | `ButtonProps`, `IconElement`        |
| Files               | kebab-case for utilities, PascalCase for components | `use-current-view.ts`, `Button.tsx` |

### File Organization

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Entry point
│   ├── handlers/   # IPC handlers
│   └── types/      # TypeScript types
├── preload/        # Preload scripts
├── renderer/       # React frontend
│   ├── components/
│   │   ├── ui/     # Reusable UI components
│   │   └── views/  # Page views
│   ├── contexts/   # React contexts
│   ├── hooks/      # Custom hooks
│   ├── constants/  # Constants
│   ├── types/      # TypeScript types
│   └── assets/     # Static assets
├── shared/         # Shared between processes
└── types/          # Global types
```

### Error Handling

- Use `try/catch` with `allowEmptyCatch: true` for catch blocks that don't need handling
- Handle promise rejections explicitly

### Other Guidelines

- **No comments** in code unless explicitly requested
- Use `console.error` or `console.warn` for logging (no external loggers)
- React `key` props required for lists
- Accessibility: Use semantic HTML, include `aria-label` for icon-only buttons
- **Pre-commit hooks**: Husky runs lint-staged (Prettier + ESLint)

## Key Configuration Files

| File                      | Purpose                           |
| ------------------------- | --------------------------------- |
| `package.json`            | Dependencies and scripts          |
| `eslint.config.mjs`       | ESLint rules                      |
| `.prettierrc`             | Prettier settings                 |
| `tsconfig.json`           | TypeScript project references     |
| `tsconfig.node.json`      | Main/preload TypeScript config    |
| `tsconfig.web.json`       | Renderer TypeScript config        |
| `electron.vite.config.ts` | Vite/Electron-Vite configuration  |
| `src/renderer/styles.css` | Tailwind v4 imports and utilities |
