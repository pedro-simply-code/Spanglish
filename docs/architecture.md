# Architecture (Spanglish)

Conventions for humans and AI agents. Enforceable rules live in ESLint and `tsconfig.json`.

## Language

**English only** for source comments, documentation, commit messages, and developer-facing strings (including ESLint messages and env file comments).

## `src/` layout

| Folder | Responsibility |
| --- | --- |
| `app/` | Routes, layouts, and App Router–coupled UI. |
| `components/` | Reusable UI without domain logic. |
| `features/` | Domain modules (auth, lessons, etc.). Each exposes an API via `index.ts`. |
| `lib/` | Pure utilities, no React or data access. |
| `server/` | Server-only: DB, services, shared Server Actions. |

**New product functionality** → `src/features/<name>/`.

## Imports

- Always use the `@/` alias (ESLint); never `./` or `../` for code under `src/`.
- npm packages and framework modules (`next`, `react`, `zod`, …) are unchanged.

## Features

- From `app/`, `components/`, `lib/`, or `server/`: import only `@/features/<name>` (barrel), not internal paths like `@/features/auth/hooks/...`.
- Within the same feature you may use `@/features/<name>/...`.
- Across features: barrel only (`@/features/<other>`), never another feature’s internal files (convention + review; ESLint blocks deep imports from external layers).

## Next.js (App Router)

- **Server Components** by default.
- Add `'use client'` only when you need state, effects, or browser APIs.
- Before uncommon APIs in this Next.js version, read `node_modules/next/dist/docs/`.
- Data and APIs: prefer Server Actions or `app/api/` handlers as appropriate.

## Environment variables

- Define and read only via `src/env.ts`; import `env` from `@/env`.
- Do not use `process.env` in application code.
- New variables: schema in `env.ts`, value in `.env`, template in `.env.example`.

## Quality

Before merge or when finishing an AI-assisted task:

```bash
npm run check
```

Runs `typecheck`, `lint`, and `build`.
