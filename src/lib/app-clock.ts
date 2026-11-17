/**
 * Live clock for persisted data. Demo-only surfaces can still import `demoNow`.
 */
export function appNow(): string {
  return new Date().toISOString();
}

export function appNowDate(): Date {
  return new Date();
}