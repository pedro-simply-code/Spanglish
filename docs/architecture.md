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

## List pagination

Admin and dashboard tables use **10 items per page** (`src/lib/pagination.ts`). Paginate on the server when the dataset is large; use `ListPagination` in client components when filtering happens in the browser.

## Environment variables

- Define and read only via `src/env.ts`; import `env` from `@/env`.
- Do not use `process.env` in application code.
- New variables: schema in `env.ts`, value in `.env`, template in `.env.example`.

## Product docs

- [Roles and permissions](./roles-and-permissions.md): role model, cumulative
  permissions, one visible dashboard, dashboard switcher, demo accounts.
- [Live classes](./live-classes.md): status model, routes, cancel/reschedule
  policy, classroom access, meeting provider.
- [API](./api.md): `/api/v1` JSON API shared by the web and the Android app.

## Translations (en / es)

- `next-intl` without locale prefixes in URLs. The locale comes from the
  user's profile when signed in, otherwise the `NEXT_LOCALE` cookie or the
  browser's `Accept-Language` (`src/i18n/`).
- Base messages live in `src/i18n/messages/{en,es}.json`; area messages live
  in per-area files such as `shell.{en,es}.json`, `student.{en,es}.json`,
  `educator.{en,es}.json`, `admin.{en,es}.json`, `classroom.{en,es}.json`,
  `marketing.{en,es}.json`, `apps.{en,es}.json`, and `ops.{en,es}.json`.
  `src/i18n/messages.ts` merges them; add every key to both locales of the
  same area file.
- Server code returns stable error codes; the client translates them
  (`errors.*`). Emails are localized in `src/server/email/templates.ts`.
- All user-facing areas are translated: auth, onboarding, profile, security,
  dashboards, classroom, marketing, apps, and operational notices.

## Quality

Before merge or when finishing an AI-assisted task:

```bash
npm run check
```

Runs `typecheck`, `lint`, and `build`.
