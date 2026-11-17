import { describe, expect, it } from "vitest";
import {
  decideClassChange,
  defaultClassPolicy,
  getClassStatus,
  getJoinState,
  getUpcomingClasses,
} from "@/features/classes/policy";
import type { LiveClass } from "@/features/classes/types";

const HOUR = 3_600_000;
const now = "2026-11-17T15:00:00.000Z";
const at = (offsetHours: number) => new Date(new Date(now).getTime() + offsetHours * HOUR).toISOString();

function liveClass(startsInHours: number, extra: Partial<LiveClass> = {}): LiveClass {
  return {
    id: `class-${startsInHours}`,
    teacherId: "t1",
    teacherName: "Teacher",
    teacherAvatar: "",
    topic: "Topic",
    description: "",
    type: "one-on-one",
    duration: 50,
    startsAt: at(startsInHours),
    timeZone: "America/New_York",
    meetingRoom: "class-1",
    creditCost: 1,
    agenda: [],
    outcomes: [],
    materials: [],
    ...extra,
  } as LiveClass;
}

describe("getClassStatus", () => {
  it("derives upcoming, in-progress and completed from the clock", () => {
    expect(getClassStatus(liveClass(2), now)).toBe("upcoming");
    expect(getClassStatus(liveClass(-0.5), now)).toBe("in-progress");
    expect(getClassStatus(liveClass(-2), now)).toBe("completed");
  });

  it("a canceled class stays canceled", () => {
    expect(getClassStatus(liveClass(48, { statusOverride: "canceled" }), now)).toBe("canceled");
  });
});

describe("decideClassChange (24-hour rule)", () => {
  it("allows changes more than 24 hours ahead", () => {
    const decision = decideClassChange(liveClass(30), "cancel", now);
    expect(decision.allowed).toBe(true);
    expect(decision.cutoffAt).toBe(at(6));
  });

  it("refuses changes inside the window", () => {
    expect(decideClassChange(liveClass(23), "cancel", now).allowed).toBe(false);
    expect(decideClassChange(liveClass(23), "reschedule", now).allowed).toBe(false);
  });

  it("refuses changes to started, finished or canceled classes", () => {
    expect(decideClassChange(liveClass(-0.2), "cancel", now).allowed).toBe(false);
    expect(decideClassChange(liveClass(-5), "reschedule", now).allowed).toBe(false);
    expect(decideClassChange(liveClass(40, { statusOverride: "canceled" }), "cancel", now).allowed).toBe(false);
  });

  it("uses the policy's cutoffs", () => {
    const policy = { ...defaultClassPolicy, rescheduleCutoffHours: 2 };
    expect(decideClassChange(liveClass(3), "reschedule", now, policy).allowed).toBe(true);
    expect(decideClassChange(liveClass(3), "cancel", now, policy).allowed).toBe(false);
  });
});

describe("getJoinState", () => {
  it("opens 15 minutes before and closes 15 minutes after the start", () => {
    expect(getJoinState(liveClass(1), now).status).toBe("too-early");
    expect(getJoinState(liveClass(0.2), now).canJoin).toBe(true);
    expect(getJoinState(liveClass(-0.2), now).canJoin).toBe(true);
    expect(getJoinState(liveClass(-0.5), now).status).toBe("closed");
    expect(getJoinState(liveClass(-2), now).status).toBe("unavailable");
  });

  it("the relaxed testing window lets people in early", () => {
    expect(getJoinState(liveClass(3), now, { ...defaultClassPolicy, relaxJoinWindow: true }).canJoin).toBe(true);
  });
});

it("getUpcomingClasses sorts by start and drops the rest", () => {
  const list = [liveClass(10), liveClass(-3), liveClass(2), liveClass(5, { statusOverride: "canceled" })];
  expect(getUpcomingClasses(list, now).map((item) => item.id)).toEqual(["class-2", "class-10"]);
});
