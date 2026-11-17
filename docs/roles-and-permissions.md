# Roles and permissions

Spanglish accounts hold one or more roles. Permissions are the **additive union**
of every role, but only **one dashboard is visible at a time**. This document
describes how the model is defined, resolved, and enforced.

Implementation lives in `src/lib/auth-roles.ts`. The auth feature re-exports it
from `src/features/auth/roles.ts`, and the public barrel exposes everything app
code needs.

## Roles

| Role | Priority | Dashboard | Adds |
| --- | --- | --- | --- |
| `student` | 0 (default) | `/home` | Own classes, booking, joining, cancelling, progress, own billing |
| `teacher` | 1 | `/teacher` | Roster access, class management, materials, earnings |
| `manager` | 2 | `/manager` | Billing, staff oversight, `teachers:approve`, `materials:moderate`, `payouts:prepare` |
| `admin` | 3 | `/admin` | `payouts:approve` (and teacher rates), role management, platform configuration |

- Each account stores **one** role in the database (`student`, `teacher`,
  `manager`, or `admin`). `normalizeRoles` picks the highest-priority role from
  input; `admin` is exclusive.
- Higher-priority role definitions still **include** lower permissions (a
  teacher can book and join classes without also holding the `student` role).
- The Student role cannot be revoked, and the admin role cannot be granted or
  removed from the app (`canChangeRole`; see "The admin" below).

## One visible dashboard

`dashboardByRole` maps each role to exactly one route. The active dashboard is
resolved on the server:

1. `getPreferredDashboardRole` reads the `spanglish_dashboard` cookie.
2. If that role belongs to the account, it wins.
3. Otherwise the highest-priority role wins (`getPrimaryRole`).

The choice lives in the `spanglish_dashboard` preference cookie (1 year,
httpOnly). `clearSession` signs out only the current session; the dashboard
preference survives, so the next sign-in resumes the last dashboard.

### Switching

`switchDashboardAction` (a server action) validates that the account owns the
requested role, calls `setActiveRole`, and redirects to that role's dashboard.
`DashboardSwitcher` renders **one button per owned role** in the topbar, with the
active role highlighted. A single-role account sees its one active button.

### Guards

`requireDashboard(role)` is used by every dashboard page:

- If the account lacks the role, or the role is not active, it redirects to the
  active dashboard.
- As a result, `/teacher`, `/manager`, and `/admin` never render alongside
  `/home`.

Shared academy pages (`/classes`, `/settings`, `/pricing`, …) are not
dashboards and stay reachable from every active dashboard.

## Demo accounts

`npm run db:seed` creates users only (no classes, no admin), all with password
`Spanglish1!` and a completed profile (`src/lib/demo-accounts.ts`):

| Emails | Roles | Starts on |
| --- | --- | --- |
| `student@`, `student2@` … `student10@` | Student | `/home` |
| `teacher@`, `teacher2@` … `teacher5@` | Teacher | `/teacher` |
| `manager@`, `manager2@` | Manager | `/manager` |

All under `@spanglish.academy`. Pairs: `student7` + `student8`, `student9` +
`student10` (listed in the seed until paired classes add a pairs table).
There is no demo admin: the admin is a real account (see below), and the
seed deletes the old `admin@spanglish.academy` if an earlier seed made it.
The login page lists one account per role, only in
development or with `ENABLE_DEMO_ACCOUNTS=true`. The seed refuses
`NODE_ENV=production`.

## The admin (one per academy)

- The admin account holds only `admin` (its permissions include every other
  role's), so it sees only the admin dashboard.
- Exactly one account holds `admin`; the partial unique index
  `users_single_admin_idx` makes Postgres reject a second one.
- `ADMIN_EMAIL` (email only): that account becomes the admin at its first
  sign-in with a verified email; any other account loses the role
  (`src/server/auth/owner.ts`, `src/server/auth/admin-role.ts`).
- Without `ADMIN_EMAIL`: `npm run admin:promote -- you@example.com` moves the
  role to an existing, verified account (`--yes` when someone else holds it).
- The role cannot be granted or removed from the app (`canChangeRole`).
- **Managers** are invited or promoted only by the admin at
  `/admin/organization/managers` (in-app Email invitation → `/join/manager`, or direct
  promote for verified accounts). User-to-user mail stays in `/apps/email`, not SMTP.
- Every move is in the audit log (`role.admin_granted` / `role.admin_revoked`)
  and the new admin gets an email. The admin dashboard asks for 2FA until it
  is on.

## Authentication (Better Auth)

Authentication runs on [Better Auth](https://better-auth.com):
`src/server/auth/auth.ts` (server config), `src/app/api/auth/[...all]/route.ts`
(endpoints), and `src/features/auth/auth-client.ts` (browser client). The
Android app will call the same `/api/auth` endpoints.

### Sign-in and sign-up (same three methods)

| Method | Sign-up | Email verification |
| --- | --- | --- |
| Email + password | `/register` → `signUp.email` | **Required**: 6-digit code (`emailOTP` verify-email); sign-in is refused until verified |
| Email + code | `/login` or `/register` → `emailOtp` + `signIn.emailOtp`; creates the account on first use | Not needed: the code proves the inbox |
| Google | `signIn.social` (OAuth + PKCE), callback `/api/auth/callback/google` | Not needed: Google returns verified emails |

- Same email across methods = one account (`accountLinking`, Google trusted).
- Sign-up of an existing email shows the same screen and emails the owner a
  notice, so the form does not reveal which emails have accounts.
- Password reset: `/recover-password`, emailed code, then a new password;
  every other session is signed out.
- Accounts without a password can create one in Settings → Security.

### Onboarding

New accounts (any method) must finish `/onboarding` before any dashboard
opens: name, app language, time zone, what they want to learn, level,
optional goal, and acceptance of the terms (`termsAcceptedAt`,
`termsVersion`). `getActor` redirects there while `profileCompletedAt` is
empty, and `getActorWithPermission` returns null for Server Actions.

### Sessions

Sessions are rows in `sessions` (cookie `spanglish.session_token` on the
web; Bearer tokens for the Android app — see [API](./api.md)). `src/proxy.ts`
sends visitors without a session cookie on private routes to
`/login?next=<path>`; the real checks stay in the pages and actions. Settings → Security lists
devices and signs them out. Roles are read from the database on each request,
so a removed role stops working at once.

### Two-factor (optional for every account)

- Settings → Security: QR code + manual key, confirmation code, 10 backup
  codes; turn off or regenerate codes (password required when the account has
  one; accounts without a password confirm with an authenticator code, and
  direct HTTP calls to those endpoints without a password are refused).
- Email + password sign-in: Better Auth's challenge on `/two-factor`
  (optional "trust this device" for 30 days).
- Email-code and Google sign-ins: Better Auth does not challenge these, so
  the session starts with `twoFactorPending = true`. Such a session cannot
  open pages, Server Actions, or `/api/auth` endpoints (except sign-out and
  the 2FA check) until `/two-factor` verifies a code; 5 wrong codes sign it
  out.

### Safeguards

- Per-IP rate limits (Better Auth `rateLimit`, table `rate_limits`) plus
  per-email limits (`src/server/auth/rate-limit.ts`, table
  `auth_rate_limits`) on sign-in, sign-up, code requests and code checks.
- Email codes: 6 digits, stored hashed, 5 attempts each, expire after
  `EMAIL_CODE_TTL_MINUTES`.
- Without email delivery, `npm run dev` prints codes in the server terminal;
  they are never sent to the browser.
- Demo accounts are listed on the login page only in development or with
  `ENABLE_DEMO_ACCOUNTS=true`.
- Cloudflare Turnstile (optional, `TURNSTILE_SECRET_KEY` +
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) on sign-up, code requests and password
  reset.
- Security headers in `next.config.ts` (CSP, `X-Frame-Options`,
  `Permissions-Policy` — camera and microphone only in the classroom, HSTS in
  production).
- Audit log (`audit_logs`, `src/server/audit/audit-log.ts`): sign-ins, failed
  sign-ins, rate limits, password and 2FA changes, sign-outs, bounces. Admins
  see it at `/admin/audit`.
- Security emails (localized): new device sign-in, password changed or reset,
  2FA turned off, sign-up attempt on an existing email.
- Postmark webhook `/api/webhooks/postmark` marks hard bounces and spam
  complaints (`users.email_bounced_at`) so notices stop going to them.

### Database setup

`npm run db:push` creates the tables. To move a database from the old custom
auth schema (demo data only — it deletes everything):
`npm run db:reset -- --yes`, then `npm run db:push` and `npm run db:seed`.

## Becoming a teacher

Teachers are not created by hand: a student applies at `/apply`, and a manager
(or the admin) reviews it at `/manager/applications`
(`src/server/teaching/applications.ts`). Approving changes the account's single
role to `teacher`, ends any active student pair and creates the teacher profile.
It is refused while the applicant still has upcoming classes as a student.
Both outcomes send an email and an audit event.

## Money, materials and ratings (phase 3)

- **Earnings** (`src/server/teaching/earnings.ts`): each delivered class earns a
  fixed rate (`payout_settings`, edited by the admin at
  `/admin/commerce/teacher-rates`), with an uplift for paired classes and the
  teacher's level multiplier (`src/lib/teacher-pay.ts`, `src/lib/teacher-levels.ts`).
- **Payouts**: a manager groups unpaid earnings of an ended month into a batch
  (`/manager/payouts`); only the admin approves or rejects it and, after sending
  the money outside the app, marks it paid with a reference
  (`/admin/finance/payouts`).
- **Materials** (`src/server/materials/library.ts`): `private` (author only),
  `shared` (all teachers), `global` (students too, after a manager approves it
  at `/manager/materials`). Students also see materials attached to their classes.
- **Ratings**: participants rate a finished class (1–5 stars) for 14 days.
  Ratings and classes taught decide the teacher's level and badges.

## Adding a role or permission

1. Edit `src/lib/auth-roles.ts`: add the code, definition, permissions, and
   dashboard route.
2. Update `src/features/auth/roles.ts` only if the barrel shape changes (it uses
   `export *`).
3. Guard server actions with `getActorWithPermission("<permission>")`.
4. Add the route under `src/app/(dashboard)` and call `requireDashboard`.
5. Update this table, the demo account list and `tests/unit/auth-roles.test.ts`.

## Current limits

Accounts, sessions, classes, credits, materials, applications, earnings,
payouts and ratings persist in PostgreSQL (`src/server/db/`). Assignments,
practice forms and their submissions are still demo data. Role changes are validated by `canChangeRole` but are not
yet editable from the admin UI.
