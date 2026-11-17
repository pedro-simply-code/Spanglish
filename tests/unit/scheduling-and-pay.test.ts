import { describe, expect, it } from "vitest";
import { validateWindows } from "@/lib/availability-rules";
import { nextLevelGap, teacherBadges, teacherLevelFor, type TeacherStats } from "@/lib/teacher-levels";
import { classEarning, defaultPayoutSettings } from "@/lib/teacher-pay";
import {
  addLocalDays,
  formatMinuteOfDay,
  parseTimeOfDay,
  resolveTimeZone,
  zonedParts,
  zonedTimeToUtc,
} from "@/lib/timezone";

describe("timezone helpers", () => {
  it("converts a local wall time to UTC across DST", () => {
    // New York is UTC-4 in July and UTC-5 in December.
    expect(zonedTimeToUtc({ year: 2026, month: 7, day: 1, minuteOfDay: 9 * 60 }, "America/New_York").toISOString()).toBe(
      "2026-07-01T13:00:00.000Z",
    );
    expect(zonedTimeToUtc({ year: 2026, month: 12, day: 1, minuteOfDay: 9 * 60 }, "America/New_York").toISOString()).toBe(
      "2026-12-01T14:00:00.000Z",
    );
  });

  it("round-trips through zonedParts", () => {
    const instant = zonedTimeToUtc({ year: 2026, month: 3, day: 20, minuteOfDay: 17 * 60 + 30 }, "Europe/Madrid");
    const parts = zonedParts(instant, "Europe/Madrid");
    expect([parts.year, parts.month, parts.day, parts.minuteOfDay]).toEqual([2026, 3, 20, 17 * 60 + 30]);
  });

  it("adds calendar days across months", () => {
    expect(addLocalDays({ year: 2026, month: 1, day: 30 }, 3)).toMatchObject({ year: 2026, month: 2, day: 2 });
  });

  it("parses and formats times of day", () => {
    expect(parseTimeOfDay("09:30")).toBe(570);
    expect(parseTimeOfDay("24:00")).toBe(1440);
    expect(parseTimeOfDay("24:30")).toBeNull();
    expect(parseTimeOfDay("9h")).toBeNull();
    expect(formatMinuteOfDay(570)).toBe("09:30");
  });

  it("falls back to the academy zone for unknown values", () => {
    expect(resolveTimeZone("Not/AZone")).toBe("America/New_York");
    expect(resolveTimeZone("Europe/Madrid")).toBe("Europe/Madrid");
  });
});

describe("validateWindows", () => {
  it("accepts separate windows", () => {
    expect(
      validateWindows([
        { weekday: 1, startMinute: 540, endMinute: 720 },
        { weekday: 1, startMinute: 780, endMinute: 1020 },
        { weekday: 6, startMinute: 0, endMinute: 1440 },
      ]),
    ).toBeNull();
  });

  it("rejects bad days, short windows and overlaps", () => {
    expect(validateWindows([{ weekday: 7, startMinute: 540, endMinute: 600 }])).toBe("WINDOW_INVALID");
    expect(validateWindows([{ weekday: 2, startMinute: 540, endMinute: 560 }])).toBe("WINDOW_INVALID");
    expect(
      validateWindows([
        { weekday: 3, startMinute: 540, endMinute: 720 },
        { weekday: 3, startMinute: 700, endMinute: 800 },
      ]),
    ).toBe("WINDOW_OVERLAP");
  });
});

const stats = (patch: Partial<TeacherStats>): TeacherStats => ({
  classesTaught: 0,
  pairedTaught: 0,
  ratingCount: 0,
  ratingAverage: 0,
  fiveStarCount: 0,
  ...patch,
});

describe("teacher levels and badges", () => {
  it("new teachers start at level 1", () => {
    expect(teacherLevelFor(stats({})).level).toBe(1);
  });

  it("needs classes, ratings and the average to level up", () => {
    expect(teacherLevelFor(stats({ classesTaught: 60, ratingCount: 10, ratingAverage: 4.6 })).level).toBe(2);
    expect(teacherLevelFor(stats({ classesTaught: 60, ratingCount: 10, ratingAverage: 4.2 })).level).toBe(1);
    expect(teacherLevelFor(stats({ classesTaught: 600, ratingCount: 80, ratingAverage: 4.9 })).level).toBe(4);
  });

  it("reports what is missing for the next level", () => {
    const gap = nextLevelGap(stats({ classesTaught: 40, ratingCount: 2, ratingAverage: 5 }));
    expect(gap).toMatchObject({ classes: 10, ratings: 3 });
    expect(nextLevelGap(stats({ classesTaught: 600, ratingCount: 80, ratingAverage: 4.9 }))).toBeNull();
  });

  it("awards badges", () => {
    const ids = teacherBadges(stats({ classesTaught: 55, pairedTaught: 25, ratingCount: 12, ratingAverage: 4.9, fiveStarCount: 11 })).map(
      (badge) => badge.id,
    );
    expect(ids).toEqual(["first-class", "fifty", "paired-pro", "top-rated", "student-favorite"]);
  });
});

describe("classEarning", () => {
  it("splits credit value by platform take per level", () => {
    // $20 credit, level 1 → 25% platform, 75% teacher = $15
    expect(
      classEarning(defaultPayoutSettings, { creditValueCents: 2_000, level: 1 }).amountCents,
    ).toBe(1_500);
    // Level 4 → 10% platform, 90% = $18
    expect(classEarning(defaultPayoutSettings, { creditValueCents: 2_000, level: 4 }).amountCents).toBe(1_800);
  });

  it("applies the trial percentage on top of teacher share", () => {
    // $20 × 75% share × 50% trial = $7.50
    expect(
      classEarning(defaultPayoutSettings, {
        creditValueCents: 2_000,
        level: 1,
        billingKind: "trial",
      }).amountCents,
    ).toBe(750);
  });
});
