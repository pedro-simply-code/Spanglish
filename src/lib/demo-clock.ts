/**
 * Frozen "now" for the static demo data. Next.js rejects argument-less
 * `new Date()` and `Date.now()` while prerendering because the value changes
 * between renders, so relative demo timestamps derive from this fixed instant
 * instead of the real clock.
 */
export const demoNow = "2026-11-16T10:00:00-05:00";

/** Returns a new `Date` at the frozen demo instant. */
export function demoClock(): Date {
  return new Date(demoNow);
}
