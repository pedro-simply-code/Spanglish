# API for the mobile app (`/api/v1`)

The Android app (React Native) uses the same backend as the web: Better Auth
endpoints under `/api/auth` for signing in, and the JSON endpoints below for
app data. Both web pages and these endpoints call the same server services
(for example `cancelClassForActor` in `src/features/classes/changes.ts`), so
rules never diverge.

## Authentication

1. Sign in with a Better Auth endpoint, for example
   `POST /api/auth/sign-in/email` (`{ email, password }`),
   `POST /api/auth/sign-in/email-otp`, or
   `POST /api/auth/sign-in/social` with `{ provider: "google", idToken: { token } }`
   (native Google sign-in; the token's audience must be `GOOGLE_CLIENT_ID` or
   `GOOGLE_ANDROID_CLIENT_ID`).
2. Read the session token from the `set-auth-token` response header and keep
   it in secure storage (`expo-secure-store`).
3. Send it on every request: `Authorization: Bearer <token>`.

The token is the Better Auth session itself (a row in `sessions`): it can be
revoked from Settings → Security, expires after 30 days without use, and is
refreshed while the app is used.

Two-factor: an email + password sign-in of an account with 2FA answers
`twoFactorRedirect: true`; finish it with `POST /api/auth/two-factor/verify-totp`.
An email-code or Google sign-in of such an account returns a session that is
pending: every endpoint answers `403 TWO_FACTOR_PENDING` until the code is
verified with `POST /api/v1/me/two-factor` (`{ code, kind: "totp" | "backup" }`).

The `@better-auth/expo` client plugin handles steps 2–3 automatically when the
app is built with Expo.

## Errors

Errors are JSON with a stable code to translate in the app:

```json
{ "error": { "code": "CHANGE_NOT_ALLOWED", "message": "Changes must be requested at least 24 hours before the class starts." } }
```

| Status | Codes |
| --- | --- |
| 400 | `INVALID_INPUT`, profile validation codes (`NAME_TOO_SHORT`, `TIMEZONE_INVALID`, `TERMS_REQUIRED`, …) |
| 401 | `UNAUTHENTICATED` |
| 403 | `TWO_FACTOR_PENDING`, `PROFILE_INCOMPLETE`, `FORBIDDEN` |
| 404 | `NOT_FOUND`, `CLASS_NOT_FOUND` |
| 409 | `CHANGE_NOT_ALLOWED`, `SLOT_UNAVAILABLE`, `SLOT_IN_PAST` |
| 429 | `RATE_LIMITED` (120 requests per minute per account) |
| 500 | `SAVE_FAILED` |

## Endpoints

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/me` | — | Account, roles, active role, profile, `profileComplete`. Works before onboarding. |
| POST | `/api/v1/me/onboarding` | `{ name, locale, timezone, learningLanguage, level, goal?, acceptTerms: true }` | Completes the first-login profile. |
| PATCH | `/api/v1/me` | any of `{ name, locale, timezone, learningLanguage, level, goal }` | Edits the profile. |
| GET | `/api/v1/classes` | — | The caller's classes with `status`. |
| GET | `/api/v1/classes/:id` | — | One class with `status` and `join` (join window). |
| POST | `/api/v1/classes/:id/cancel` | `{ reason? }` | Same cutoff rules as the web. |
| POST | `/api/v1/classes/:id/reschedule` | `{ startsAt }` | New time from `GET /classes/:id/slots`. Paired classes return a proposal (`pendingChange`) the partner must accept. |
| GET | `/api/v1/classes/:id/slots` | — | Free times to move this class to. |
| POST | `/api/v1/classes/:id/proposal` | `{ requestId, accept }` | The partner accepts or declines a proposed time. |
| GET | `/api/v1/credits` | — | Balances (own and shared with the partner), partner, recent movements. |
| GET | `/api/v1/teachers` | — | Bookable teachers with `ratingAverage`, `ratingCount`, `level` and `badges`. |
| GET | `/api/v1/teachers/:id/slots?classType=one-on-one&duration=25` | — | Free start times (UTC) for the caller (and partner). |
| POST | `/api/v1/bookings` | `{ teacherId, startsAt, classType, durationMinutes, topic }` | Books and spends one credit. `NO_CREDITS` → 402, `SLOT_TAKEN`/`SLOT_UNAVAILABLE` → 409. |

Values: `locale` `en` | `es`; `learningLanguage` `spanish` | `english`;
`level` `beginner` | `intermediate` | `advanced`; `timezone` an IANA zone such
as `America/Guatemala`.

## Next endpoints

Classroom access (LiveKit token), materials, vocabulary and booking will be
added here as those features move to the database.
