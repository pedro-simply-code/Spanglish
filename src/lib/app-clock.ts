/**
 * Live clock for persisted data. Demo-only surfaces can still import `demoNow`.
 *
 * Development only: set APP_NOW_OVERRIDE (e.g. "2026-11-27T18:05:00-06:00") in
 * .env to see the app as if it were that moment (classes "live now", due
 * dates…). Nothing in the database changes, and production ignores it.
 */
function override(): Date | null {
  if (process.env.NODE_ENV === "production") return null;
  const value = process.env.APP_NOW_OVERRIDE;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function appNow(): string {
  return (override() ?? new Date()).toISOString();
}

export function appNowDate(): Date {
  return override() ?? new Date();
}
