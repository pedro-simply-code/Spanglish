<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Spanglish project conventions

Full docs: [docs/architecture.md](docs/architecture.md).

### Language

Write **English only** in code comments, docs, README/AGENTS, `.env.example`, and ESLint or config messages.

### Layout

- `src/app` — App Router
- `src/components` — reusable UI
- `src/features/<name>` — product domain (export public API from `index.ts`)
- `src/lib` — pure utilities
- `src/server` — server-only code

New domain functionality → `src/features/<name>/`.

### Next.js

- Server Components by default; `'use client'` only when required.
- Read `node_modules/next/dist/docs/` before unusual APIs in this version.

### Environment variables

- Define in `src/env.ts`; use `import { env } from "@/env"`.
- No `process.env` in app code.
- **Agents:** do not read `.env`. Use `.env.example` + `src/env.ts` for names and defaults; never echo secrets in chat.

### Imports and quality

- Internal imports use the `@/` alias (ESLint).
- After substantive changes, run `npm run check`.

### List pagination

- **10 rows per page** (`DEFAULT_PAGE_SIZE` in `src/lib/pagination.ts`) for any table or long list in the UI.
- Server lists: `limit`/`offset` on the query + `QueryPagination` with `?page=` on the route.
- Client-filtered lists: `sliceForPage` + `ListPagination` from `@/components/ui`.
- Reset to page 1 when filters change (month, tab, search).
