import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { classroomWaiting, type WaitingStatus } from "@/server/db/schema";

/** Classroom waiting room, stored in Postgres (CLASS_WAITING_ROOM=true). */

export async function requestWaitingRoomAdmission(input: {
  classId: string;
  userId: string;
  name: string;
}) {
  const [row] = await db
    .insert(classroomWaiting)
    .values({ sessionId: input.classId, userId: input.userId, name: input.name })
    .onConflictDoUpdate({
      target: [classroomWaiting.sessionId, classroomWaiting.userId],
      // Approved stays approved; a denied student may ask again.
      set: {
        status: sql<WaitingStatus>`case when ${classroomWaiting.status} = 'approved' then 'approved' else 'pending' end`,
        requestedAt: new Date(),
        name: input.name,
      },
    })
    .returning();
  return row ?? null;
}

export async function getWaitingRoomStatus(classId: string, userId: string) {
  const [row] = await db
    .select({ status: classroomWaiting.status })
    .from(classroomWaiting)
    .where(and(eq(classroomWaiting.sessionId, classId), eq(classroomWaiting.userId, userId)))
    .limit(1);
  return row?.status ?? null;
}

export async function listWaitingRoomPending(classId: string) {
  return db
    .select({ userId: classroomWaiting.userId, name: classroomWaiting.name })
    .from(classroomWaiting)
    .where(and(eq(classroomWaiting.sessionId, classId), eq(classroomWaiting.status, "pending")))
    .orderBy(asc(classroomWaiting.requestedAt));
}

async function setStatus(classId: string, userId: string, status: WaitingStatus) {
  const [row] = await db
    .update(classroomWaiting)
    .set({ status })
    .where(and(eq(classroomWaiting.sessionId, classId), eq(classroomWaiting.userId, userId)))
    .returning();
  return row ?? null;
}

export function approveWaitingRoomAdmission(classId: string, userId: string) {
  return setStatus(classId, userId, "approved");
}

export function denyWaitingRoomAdmission(classId: string, userId: string) {
  return setStatus(classId, userId, "denied");
}

export async function clearWaitingRoomClass(classId: string) {
  await db.delete(classroomWaiting).where(eq(classroomWaiting.sessionId, classId));
}
