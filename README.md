# Resonance

## Setup

```bash
pnpm install      # Install dependencies and rebuild native modules
pnpm db:migrate   # Run database migrations
```

## Development

```bash
pnpm dev          # Start dev server with hot reload
pnpm start        # Preview production build
```

## Code Quality

```bash
pnpm check        # Type check (node and web)
pnpm check:node   # Type check main process
pnpm check:web    # Type check renderer process
pnpm lint         # Check for linting issues
pnpm lint:fix     # Fix linting issues
pnpm format       # Format code with Prettier
pnpm fix          # Run lint:fix and format
```

## Build

```bash
pnpm build        # Build for production (includes type check)
pnpm build:win    # Build and package for Windows
pnpm build:linux  # Build and package for Linux
pnpm build:unpack # Build without packaging
```

## Database

```bash
pnpm db:generate  # Generate migrations from schema
pnpm db:migrate   # Run pending migrations
pnpm db:push      # Push schema changes directly (dev only)
```
