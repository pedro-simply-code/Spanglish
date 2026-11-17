import { createHash, randomBytes } from "node:crypto";
import { and, asc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { RoleCode } from "@/lib/auth-roles";
import type { AuthSession } from "@/lib/auth-types";
import { addLocalDays, zonedParts, zonedTimeToUtc } from "@/lib/timezone";
import { getTeacherTimeZone, listAvailability } from "@/server/classes/availability";
import { db } from "@/server/db";
import { calendarFeeds, classParticipants, classSessions, users } from "@/server/db/schema";

/*
 * Calendar data per dashboard (the admin has no calendar):
 * - student: their classes;
 * - teacher: their classes plus their weekly availability;
 * - manager: every class, optionally one teacher (with that teacher's availability).
 */

export type CalendarRole = Exclude<RoleCode, "admin">;

export type CalendarClass = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: "upcoming" | "in-progress" | "completed" | "canceled";
  classType: "one-on-one" | "paired";
  teacherId: string;
  teacherName: string;
  students: string[];
};

export type CalendarBlock = { start: string; end: string };

export const MAX_RANGE_DAYS = 62;

export function calendarRoleOf(actor: AuthSession): CalendarRole | null {
  return actor.activeRole === "admin" ? null : actor.activeRole;
}

function statusOf(row: { status: string; startsAt: Date; endsAt: Date }, now: number): CalendarClass["status"] {
  if (row.status === "canceled") return "canceled";
  if (row.endsAt.getTime() <= now) return "completed";
  if (row.startsAt.getTime() <= now) return "in-progress";
  return "upcoming";
}

/** Classes overlapping [from, to) that the actor may see on their calendar. */
export async function listCalendarClasses(
  actor: AuthSession,
  role: CalendarRole,
  range: { from: Date; to: Date },
  teacherId?: string,
): Promise<CalendarClass[]> {
  const inRange = and(lt(classSessions.startsAt, range.to), gte(classSessions.endsAt, range.from));
  let where;
  if (role === "student") {
    const mine = db
      .select({ id: classParticipants.sessionId })
      .from(classParticipants)
      .where(eq(classParticipants.userId, actor.userId));
    where = and(inRange, inArray(classSessions.id, mine));
  } else if (role === "teacher") {
    where = and(inRange, eq(classSessions.teacherId, actor.userId));
  } else {
    where = teacherId ? and(inRange, eq(classSessions.teacherId, teacherId)) : inRange;
  }

  const rows = await db
    .select({
      id: classSessions.id,
      topic: classSessions.topic,
      startsAt: classSessions.startsAt,
      endsAt: classSessions.endsAt,
      status: classSessions.status,
      classType: classSessions.classType,
      teacherId: classSessions.teacherId,
      teacherName: users.name,
    })
    .from(classSessions)
    .innerJoin(users, eq(users.id, classSessions.teacherId))
    .where(where)
    .orderBy(asc(classSessions.startsAt))
    .limit(1000);

  const ids = rows.map((row) => row.id);
  const people = ids.length
    ? await db
        .select({ sessionId: classParticipants.sessionId, name: users.name })
        .from(classParticipants)
        .innerJoin(users, eq(users.id, classParticipants.userId))
        .where(inArray(classParticipants.sessionId, ids))
    : [];

  const now = Date.now();
  return rows.map((row) => {
    const students = people.filter((person) => person.sessionId === row.id).map((person) => person.name);
    const who = role === "student" ? row.teacherName : students.join(" & ") || "Student";
    return {
      id: row.id,
      title: `${row.topic} · ${who}`,
      start: row.startsAt.toISOString(),
      end: row.endsAt.toISOString(),
      status: statusOf(row, now),
      classType: row.classType,
      teacherId: row.teacherId,
      teacherName: row.teacherName,
      students,
    };
  });
}

/** A teacher's weekly windows as dated blocks inside [from, to). */
export async function availabilityBlocks(teacherId: string, range: { from: Date; to: Date }): Promise<CalendarBlock[]> {
  const [windows, timeZone] = await Promise.all([listAvailability(teacherId), getTeacherTimeZone(teacherId)]);
  if (!windows.length) return [];
  const blocks: CalendarBlock[] = [];
  const first = zonedParts(new Date(range.from.getTime() - 86_400_000), timeZone);
  const days = Math.ceil((range.to.getTime() - range.from.getTime()) / 86_400_000) + 2;
  for (let offset = 0; offset < days; offset += 1) {
    const day = addLocalDays(first, offset);
    for (const window of windows.filter((item) => item.weekday === day.weekday)) {
      const start = zonedTimeToUtc({ ...day, minuteOfDay: window.startMinute }, timeZone);
      const end = zonedTimeToUtc({ ...day, minuteOfDay: window.endMinute }, timeZone);
      if (end > range.from && start < range.to) blocks.push({ start: start.toISOString(), end: end.toISOString() });
    }
  }
  return blocks;
}

export type CalendarData = { classes: CalendarClass[]; availability: CalendarBlock[] };

/** Loads the calendar for the active dashboard (managers may pick a teacher). */
export async function loadCalendarData(
  actor: AuthSession,
  input: { from: string; to: string; teacherId?: string },
): Promise<CalendarData> {
  const role = calendarRoleOf(actor);
  const from = new Date(input.from);
  const to = new Date(input.to);
  if (!role || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return { classes: [], availability: [] };
  }
  // Keep requests bounded (a month view with its overflow weeks fits).
  const end = new Date(Math.min(to.getTime(), from.getTime() + MAX_RANGE_DAYS * 86_400_000));
  const range = { from, to: end };
  const teacherId = role === "manager" ? input.teacherId || undefined : undefined;

  const [classes, availability] = await Promise.all([
    listCalendarClasses(actor, role, range, teacherId),
    role === "teacher"
      ? availabilityBlocks(actor.userId, range)
      : teacherId
        ? availabilityBlocks(teacherId, range)
        : Promise.resolve([]),
  ]);
  return { classes, availability };
}

/* Private .ics subscription */

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function hasCalendarFeed(userId: string) {
  const [row] = await db.select({ userId: calendarFeeds.userId }).from(calendarFeeds).where(eq(calendarFeeds.userId, userId)).limit(1);
  return Boolean(row);
}

/** Creates (or replaces) the user's feed token. The token is returned once. */
export async function resetCalendarFeed(userId: string) {
  const token = randomBytes(24).toString("base64url");
  await db
    .insert(calendarFeeds)
    .values({ userId, tokenHash: hashToken(token) })
    .onConflictDoUpdate({
      target: calendarFeeds.userId,
      set: { tokenHash: hashToken(token), createdAt: new Date(), lastUsedAt: null },
    });
  return token;
}

export async function userForFeedToken(token: string) {
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return null;
  const [row] = await db
    .update(calendarFeeds)
    .set({ lastUsedAt: sql`now()` })
    .where(eq(calendarFeeds.tokenHash, hashToken(token)))
    .returning({ userId: calendarFeeds.userId });
  if (!row) return null;
  const [user] = await db
    .select({ id: users.id, name: users.name, roles: users.roles })
    .from(users)
    .where(eq(users.id, row.userId))
    .limit(1);
  return user ?? null;
}

function icsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const icsDate = (iso: string) => iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** iCalendar text for a feed (past 30 days to 90 days ahead). */
export function buildIcs(input: { name: string; classes: CalendarClass[]; baseUrl: string }) {
  const stamp = icsDate(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Spanglish Academy//Classes//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsText(`Spanglish · ${input.name}`)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
  ];
  for (const item of input.classes) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${item.id}@spanglish.academy`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(item.start)}`,
      `DTEND:${icsDate(item.end)}`,
      `SUMMARY:${icsText(item.title)}`,
      `DESCRIPTION:${icsText(`Open the class: ${input.baseUrl}/classes/${item.id}`)}`,
      `URL:${input.baseUrl}/classes/${item.id}`,
      `STATUS:${item.status === "canceled" ? "CANCELLED" : "CONFIRMED"}`,
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  // RFC 5545: CRLF line endings, lines folded at 75 octets.
  return lines
    .map((line) => (line.length <= 74 ? line : line.match(/.{1,73}/g)!.join("\r\n ")))
    .join("\r\n");
}
