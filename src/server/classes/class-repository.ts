import { and, asc, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import type { LiveClass } from "@/features/classes";
import { resolveTimeZone } from "@/lib/timezone";
import { db } from "@/server/db";
import {
  classChangeRequests,
  classParticipants,
  classSessions,
  recordings,
  users,
  type ClassSessionRow,
} from "@/server/db/schema";

/*
 * Class sessions as the UI sees them (`LiveClass`). Reads only: booking,
 * cancel and reschedule live in `booking.ts`.
 */


export function classRoomName(sessionId: string) {
  return `class-${sessionId}`;
}

/** Session id from a LiveKit room name (`class-<id>`), or null. */
export function sessionIdFromRoomName(roomName: string) {
  return roomName.startsWith("class-") ? roomName.slice("class-".length) : null;
}

async function toViews(rows: ClassSessionRow[]): Promise<LiveClass[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const teacherIds = [...new Set(rows.map((row) => row.teacherId))];

  const [teacherRows, participantRows, pendingRows, recordingRows] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        image: users.image,
        timezone: users.timezone,
      })
      .from(users)
      .where(inArray(users.id, teacherIds)),
    db
      .select({
        sessionId: classParticipants.sessionId,
        userId: classParticipants.userId,
        firstJoinedAt: classParticipants.firstJoinedAt,
        name: users.name,
        image: users.image,
      })
      .from(classParticipants)
      .innerJoin(users, eq(users.id, classParticipants.userId))
      .where(inArray(classParticipants.sessionId, ids)),
    db
      .select({
        id: classChangeRequests.id,
        sessionId: classChangeRequests.sessionId,
        newStartsAt: classChangeRequests.newStartsAt,
        requestedByUserId: classChangeRequests.requestedByUserId,
        expiresAt: classChangeRequests.expiresAt,
        requestedByName: users.name,
      })
      .from(classChangeRequests)
      .innerJoin(users, eq(users.id, classChangeRequests.requestedByUserId))
      .where(
        and(
          inArray(classChangeRequests.sessionId, ids),
          eq(classChangeRequests.status, "pending"),
          gte(classChangeRequests.expiresAt, new Date()),
        ),
      ),
    db
      .select({ id: recordings.id, sessionId: recordings.sessionId })
      .from(recordings)
      .where(and(inArray(recordings.sessionId, ids), eq(recordings.status, "ready")))
      .orderBy(desc(recordings.createdAt)),
  ]);

  const teachers = new Map(teacherRows.map((row) => [row.id, row]));
  const pending = new Map(pendingRows.map((row) => [row.sessionId, row]));
  const latestRecording = new Map<string, string>();
  for (const row of recordingRows) {
    if (!latestRecording.has(row.sessionId)) latestRecording.set(row.sessionId, row.id);
  }

  return rows.map((row) => {
    const teacher = teachers.get(row.teacherId);
    const participants = participantRows
      .filter((item) => item.sessionId === row.id)
      .map((item) => ({
        userId: item.userId,
        name: item.name,
        image: item.image,
        joined: Boolean(item.firstJoinedAt),
      }));
    const change = pending.get(row.id);

    const view: LiveClass = {
      id: row.id,
      teacherId: row.teacherId,
      teacherName: teacher?.name ?? "Teacher",
      teacherAvatar: teacher?.image ?? "",
      topic: row.topic,
      description: row.description,
      type: row.classType,
      duration: row.durationMinutes as LiveClass["duration"],
      startsAt: row.startsAt.toISOString(),
      timeZone: resolveTimeZone(teacher?.timezone),
      meetingRoom: classRoomName(row.id),
      creditCost: 1,
      agenda: row.agenda,
      outcomes: row.outcomes,
      materials: row.materials,
      materialIds: row.materialIds,
      assignmentIds: row.assignmentIds,
      recordingId: latestRecording.get(row.id),
      recap: row.recap ?? undefined,
      teacherNote: row.teacherNote ?? undefined,
      homework: row.homework ?? undefined,
      attended: participants.length ? participants.some((item) => item.joined) : undefined,
      cancellation: row.cancellation
        ? {
            by: row.cancellation.by,
            reason: row.cancellation.reason,
            at: row.cancellation.at,
            creditRefunded: row.cancellation.creditRefunded,
          }
        : undefined,
      rescheduledFrom: row.rescheduledFrom?.toISOString(),
      statusOverride: row.status === "canceled" ? "canceled" : undefined,
      participants,
      pairId: row.pairId,
      bookedByUserId: row.bookedByUserId,
      pendingChange: change
        ? {
            id: change.id,
            newStartsAt: change.newStartsAt.toISOString(),
            requestedByUserId: change.requestedByUserId,
            requestedByName: change.requestedByName,
            expiresAt: change.expiresAt.toISOString(),
          }
        : null,
    };
    return view;
  });
}

/** Classes a student takes part in (both partners see paired classes). */
export async function listClassesForStudent(userId: string) {
  const rows = await db
    .select({ session: classSessions })
    .from(classSessions)
    .innerJoin(classParticipants, eq(classParticipants.sessionId, classSessions.id))
    .where(eq(classParticipants.userId, userId))
    .orderBy(asc(classSessions.startsAt));
  return toViews(rows.map((row) => row.session));
}

export async function listClassesForTeacher(teacherId: string) {
  const rows = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.teacherId, teacherId))
    .orderBy(asc(classSessions.startsAt));
  return toViews(rows);
}

/** Sessions that overlap [from, to) (start before `to` and end after `from`). */
export async function listClassesOverlapping(range: { from: Date; to: Date; limit?: number }) {
  const rows = await db
    .select()
    .from(classSessions)
    .where(and(lt(classSessions.startsAt, range.to), gte(classSessions.endsAt, range.from)))
    .orderBy(asc(classSessions.startsAt))
    .limit(range.limit ?? 500);
  return toViews(rows);
}

/** Every class in a window (managers and the admin). */
export async function listAllClasses(input: { from?: Date; to?: Date; limit?: number } = {}) {
  const conditions = [
    input.from ? gte(classSessions.startsAt, input.from) : undefined,
    input.to ? lt(classSessions.startsAt, input.to) : undefined,
  ].filter((value) => value !== undefined);

  const rows = await db
    .select()
    .from(classSessions)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(asc(classSessions.startsAt))
    .limit(input.limit ?? 500);
  return toViews(rows);
}

export async function getClassView(sessionId: string) {
  const [row] = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  if (!row) return null;
  const [view] = await toViews([row]);
  return view ?? null;
}

/** Raw session plus the ids that may see it (for access checks). */
export async function getSessionAccess(sessionId: string) {
  const [row] = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  if (!row) return null;

  const participants = await db
    .select({ userId: classParticipants.userId })
    .from(classParticipants)
    .where(eq(classParticipants.sessionId, sessionId));

  return { row, participantIds: participants.map((item) => item.userId) };
}

/** Counts per status for dashboards (scheduled vs canceled). */
export async function countSessions() {
  const [row] = await db
    .select({
      total: sql<number>`count(*)::int`,
      canceled: sql<number>`count(*) filter (where ${classSessions.status} = 'canceled')::int`,
    })
    .from(classSessions);
  return row ?? { total: 0, canceled: 0 };
}
