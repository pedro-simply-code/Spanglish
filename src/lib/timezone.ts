/*
 * Small time-zone helpers built on Intl (no extra dependency). Teacher
 * availability is stored as local wall time in the teacher's zone; bookings
 * are stored as UTC instants.
 */

export const DEFAULT_TIME_ZONE = "America/New_York";

export function isValidTimeZone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(value: string | null | undefined) {
  return isValidTimeZone(value) ? value : DEFAULT_TIME_ZONE;
}

export type ZonedParts = {
  year: number;
  month: number;
  day: number;
  /** 0 = Sunday. */
  weekday: number;
  /** Minutes since local midnight. */
  minuteOfDay: number;
};

const weekdayIndex: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let value = formatters.get(timeZone);
  if (!value) {
    value = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
    });
    formatters.set(timeZone, value);
  }
  return value;
}

/** Wall-clock parts of an instant in a time zone. */
export function zonedParts(date: Date, timeZone: string): ZonedParts & { second: number } {
  const parts: Record<string, string> = {};
  for (const part of formatter(timeZone).formatToParts(date)) {
    parts[part.type] = part.value;
  }
  const hour = Number(parts.hour) % 24;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    weekday: weekdayIndex[parts.weekday ?? "Sun"] ?? 0,
    minuteOfDay: hour * 60 + Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Offset of the zone from UTC at an instant, in minutes (e.g. -300 for EST). */
export function timeZoneOffsetMinutes(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const wallAsUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    Math.floor(p.minuteOfDay / 60),
    p.minuteOfDay % 60,
    p.second,
  );
  return Math.round((wallAsUtc - date.getTime()) / 60_000);
}

/**
 * The UTC instant of a local wall time. In a DST gap the result moves forward
 * with the clock change, like most calendars do.
 */
export function zonedTimeToUtc(
  local: { year: number; month: number; day: number; minuteOfDay: number },
  timeZone: string,
): Date {
  const guess = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    Math.floor(local.minuteOfDay / 60),
    local.minuteOfDay % 60,
  );
  const first = timeZoneOffsetMinutes(new Date(guess), timeZone);
  let result = guess - first * 60_000;
  const second = timeZoneOffsetMinutes(new Date(result), timeZone);
  if (second !== first) result = guess - second * 60_000;
  return new Date(result);
}

/** Calendar date `days` after the given local date (no time-zone math). */
export function addLocalDays(
  date: { year: number; month: number; day: number },
  days: number,
) {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
    weekday: value.getUTCDay(),
  };
}

export function localDateKey(date: { year: number; month: number; day: number }) {
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`;
}

export function formatMinuteOfDay(minute: number) {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

export function parseTimeOfDay(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) return null;
  return hours * 60 + minutes;
}
