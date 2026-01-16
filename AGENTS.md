# Agent Guidelines for this Repository

## Build / Test / Lint Commands

**Development:**
- `bun run dev` - Start dev server with HMR (runs `bun --hot src/index.ts`)
- `bun run start` - Run production server
- `bun run build` - Build the application

**Testing:**
- `bun test` - Run all tests
- `bun test <pattern>` - Run specific tests matching pattern (e.g., `bun test APITester`)
- Tests use Vitest with Bun (import from `vitest` or `bun:test`)

**Package Management:**
- `bun install` - Install dependencies
- `bun add <pkg>` - Add dependency
- `bun add -d <pkg>` - Add dev dependency
- `bunx <pkg>` - Execute package (like npx)

## Code Style Guidelines

### Runtime & APIs
**Use Bun APIs instead of Node:**
- `Bun.serve()` for servers (not express)
- `bun:sqlite` for SQLite (not better-sqlite3)
- `Bun.redis` for Redis (not ioredis)
- `Bun.sql` for Postgres (not pg/postgres.js)
- `Bun.file()` for file I/O (not node:fs readFile/writeFile)
- `Bun.$` for shell commands (not execa)
- `bun test` for testing framework

**Don't use:**
- `dotenv` - Bun auto-loads `.env`
- `vite` - Use HTML imports with Bun
- `webpack/esbuild` - Use `bun build`

### Imports & Paths
- Use `@/*` alias for src directory: `import { App } from "@/components/App"`
- Use `.ts`/`.tsx` extensions for imports: `import { util } from "./util.ts"`
- Import React as: `import * as React from "react"`
- Named exports for components: `export function ComponentName() {}`
- Default export also acceptable for main App

### TypeScript Configuration
- Strict mode enabled
- JSX: `react-jsx`
- Path aliases: `@/*` → `./src/*`
- `verbatimModuleSyntax: true` (no duplicate types)
- `noUncheckedIndexedAccess: true`
- Use `import { type TypeName }` for type-only imports

### Component Patterns
**React 19 with Shadcn UI:**
- Use `cn()` utility for className merging: `import { cn } from "@/lib/utils"`
- `cn()` combines `clsx` and `tailwind-merge`
- Use Radix UI primitives: `@radix-ui/react-*`
- Use Class Variance Authority (cva) for component variants
- Support `asChild` prop with `Slot` from Radix UI
- Add `data-slot` attributes for styling hooks

**Component structure:**
```tsx
function Button({ className, variant, size, asChild = false, ...props }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}
```

### Styling (Tailwind CSS v4)
- Use `@import "tailwindcss"` in CSS files
- Utility classes for all styling
- CSS variables for theming (defined in styles/globals.css)
- Dark mode via `.dark` class
- Use OKLCH color space
- Responsive variants: `md:`, `lg:`, etc.
- Combine Tailwind classes with `cn()`: `className={cn("base-class", isActive && "active-class")}`

### File Organization
- `src/index.ts` - Server entry point (Bun.serve)
- `src/index.html` - HTML entry
- `src/frontend.tsx` - React client entry with HMR setup
- `src/App.tsx` - Main React app component
- `src/components/ui/` - Shadcn UI components
- `src/lib/` - Utilities (e.g., `utils.ts` with `cn()`)
- `styles/globals.css` - Global styles and Tailwind config

### Error Handling & Types
- Prefer explicit types over `any`
- Use `!` for non-null assertions only when certain
- Type function parameters: `async function handler(req: Request) {}`
- Return proper Response objects: `Response.json(data)`
- Handle errors gracefully in route handlers

### Formatting & Conventions
- Use `type` for type definitions (not `interface` unless extending)
- Function components: `function ComponentName() {}`
- Constants: `UPPER_SNAKE_CASE`
- Variables: `camelCase`
- Booleans: `isOpen`, `isLoading`, `hasError`
- Event handlers: `handleClick`, `handleSubmit`, `onChange`
- No comments unless necessary for complex logic
- Use JSDoc for public API documentation

### Testing
- Use `import { test, expect, describe } from "bun:test"` or `"vitest"`
- Test files: `*.test.ts` or `*.test.tsx` in same directory
- Before/after hooks for setup/teardown
- Descriptive test names
- Test one behavior per test

### Development Notes
- HMR enabled in dev mode via `import.meta.hot`
- Check `process.env.NODE_ENV` for dev/prod detection
- Development tools: `hmr: true, console: true` in Bun.serve config
