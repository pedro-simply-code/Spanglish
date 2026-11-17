import { randomUUID } from "node:crypto";
import { and, asc, eq, gt, inArray, lt, ne } from "drizzle-orm";
import {
  addLocalDays,
  resolveTimeZone,
  zonedParts,
  zonedTimeToUtc,
} from "@/lib/timezone";
import { db } from "@/server/db";
import { validateWindows, type AvailabilityWindow } from "@/lib/availability-rules";

export { validateWindows, type AvailabilityError, type AvailabilityWindow } from "@/lib/availability-rules";
import {
  classParticipants,
  classSessions,
  teacherAvailability,
  users,
} from "@/server/db/schema";

/*
 * Teacher availability (weekly windows in the teacher's zone) and the free
 * slots students can book: availability minus the teacher's and the
 * students' scheduled classes.
 */

/** Slots start every 30 minutes inside a window. */
export const SLOT_STEP_MINUTES = 30;
/** Students cannot book a class that starts sooner than this. */
export const MIN_BOOKING_LEAD_MINUTES = 60;
/** How far ahead students can book. */
export const BOOKING_HORIZON_DAYS = 21;


export async function getTeacherTimeZone(teacherId: string) {
  const [row] = await db
    .select({ timezone: users.timezone })
    .from(users)
    .where(eq(users.id, teacherId))
    .limit(1);
  return resolveTimeZone(row?.timezone);
}

export async function listAvailability(teacherId: string): Promise<AvailabilityWindow[]> {
  return db
    .select({
      weekday: teacherAvailability.weekday,
      startMinute: teacherAvailability.startMinute,
      endMinute: teacherAvailability.endMinute,
    })
    .from(teacherAvailability)
    .where(eq(teacherAvailability.teacherId, teacherId))
    .orderBy(asc(teacherAvailability.weekday), asc(teacherAvailability.startMinute));
}

/** Replaces the teacher's weekly windows. */
export async function replaceAvailability(teacherId: string, windows: AvailabilityWindow[]) {
  const error = validateWindows(windows);
  if (error) return { ok: false as const, code: error };

  await db.delete(teacherAvailability).where(eq(teacherAvailability.teacherId, teacherId));
  if (windows.length) {
    await db.insert(teacherAvailability).values(
      windows.map((window) => ({
        id: randomUUID(),
        teacherId,
        weekday: window.weekday,
        startMinute: window.startMinute,
        endMinute: window.endMinute,
      })),
    );
  }
  return { ok: true as const };
}

type Interval = { start: number; end: number };

async function busyIntervals(input: {
  teacherId: string;
  studentIds: string[];
  from: Date;
  to: Date;
  ignoreSessionId?: string;
}): Promise<Interval[]> {
  const window = and(
    eq(classSessions.status, "scheduled"),
    lt(classSessions.startsAt, input.to),
    gt(classSessions.endsAt, input.from),
    input.ignoreSessionId ? ne(classSessions.id, input.ignoreSessionId) : undefined,
  );

  const [teacherRows, studentRows] = await Promise.all([
    db
      .select({ startsAt: classSessions.startsAt, endsAt: classSessions.endsAt })
      .from(classSessions)
      .where(and(eq(classSessions.teacherId, input.teacherId), window)),
    input.studentIds.length
      ? db
          .select({ startsAt: classSessions.startsAt, endsAt: classSessions.endsAt })
          .from(classSessions)
          .innerJoin(classParticipants, eq(classParticipants.sessionId, classSessions.id))
          .where(and(inArray(classParticipants.userId, input.studentIds), window))
      : Promise.resolve([]),
  ]);

  return [...teacherRows, ...studentRows].map((row) => ({
    start: row.startsAt.getTime(),
    end: row.endsAt.getTime(),
  }));
}

/**
 * Free start times (UTC ISO) for a class of `durationMinutes` with the teacher,
 * skipping times when the teacher or any of the students is busy.
 */
export async function listFreeSlots(input: {
  teacherId: string;
  durationMinutes: number;
  studentIds: string[];
  now?: Date;
  days?: number;
  ignoreSessionId?: string;
}): Promise<string[]> {
  const now = input.now ?? new Date();
  const days = input.days ?? BOOKING_HORIZON_DAYS;
  const [windows, timeZone] = await Promise.all([
    listAvailability(input.teacherId),
    getTeacherTimeZone(input.teacherId),
  ]);
  if (!windows.length) return [];

  const earliest = now.getTime() + MIN_BOOKING_LEAD_MINUTES * 60_000;
  const horizon = new Date(now.getTime() + (days + 1) * 86_400_000);
  const busy = await busyIntervals({
    teacherId: input.teacherId,
    studentIds: input.studentIds,
    from: now,
    to: horizon,
    ignoreSessionId: input.ignoreSessionId,
  });

  const today = zonedParts(now, timeZone);
  const slots: string[] = [];
  const durationMs = input.durationMinutes * 60_000;

  for (let offset = 0; offset <= days; offset += 1) {
    const date = addLocalDays(today, offset);
    for (const window of windows) {
      if (window.weekday !== date.weekday) continue;
      for (
        let minute = window.startMinute;
        minute + input.durationMinutes <= window.endMinute;
        minute += SLOT_STEP_MINUTES
      ) {
        const start = zonedTimeToUtc({ ...date, minuteOfDay: minute }, timeZone).getTime();
        if (start < earliest) continue;
        const end = start + durationMs;
        if (busy.some((item) => start < item.end && end > item.start)) continue;
        slots.push(new Date(start).toISOString());
      }
    }
  }

  return [...new Set(slots)].sort();
}

/** True when a specific start time is one of the free slots. */
export async function isSlotFree(input: {
  teacherId: string;
  startsAt: Date;
  durationMinutes: number;
  studentIds: string[];
  ignoreSessionId?: string;
}) {
  const slots = await listFreeSlots({
    teacherId: input.teacherId,
    durationMinutes: input.durationMinutes,
    studentIds: input.studentIds,
    ignoreSessionId: input.ignoreSessionId,
  });
  return slots.includes(input.startsAt.toISOString());
}
