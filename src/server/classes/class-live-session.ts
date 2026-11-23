import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { classSessions } from "@/server/db/schema";

/*
 * "The teacher opened the call" state, stored on the class session so it
 * survives restarts and works with several server instances.
 */

export type ClassLiveSession = {
  classId: string;
  startedAt: string;
  startedByUserId: string;
};

export async function getClassLiveSession(classId: string): Promise<ClassLiveSession | null> {
  const [row] = await db
    .select({
      startedAt: classSessions.liveStartedAt,
      startedBy: classSessions.liveStartedByUserId,
      endedAt: classSessions.liveEndedAt,
    })
    .from(classSessions)
    .where(eq(classSessions.id, classId))
    .limit(1);
  if (!row?.startedAt || row.endedAt) return null;
  return {
    classId,
    startedAt: row.startedAt.toISOString(),
    startedByUserId: row.startedBy ?? "",
  };
}

/** The teacher ended the call on purpose (it was started and then closed). */
export async function wasClassLiveSessionEnded(classId: string) {
  const [row] = await db
    .select({ startedAt: classSessions.liveStartedAt, endedAt: classSessions.liveEndedAt })
    .from(classSessions)
    .where(eq(classSessions.id, classId))
    .limit(1);
  return Boolean(row?.startedAt && row.endedAt);
}

export async function isClassLiveSessionActive(classId: string) {
  return Boolean(await getClassLiveSession(classId));
}

/** Class ids whose teacher has started (and not ended) the live session. */
export async function getActiveLiveSessionClassIds(classIds: string[]): Promise<Set<string>> {
  if (!classIds.length) return new Set();
  const rows = await db
    .select({ id: classSessions.id })
    .from(classSessions)
    .where(
      and(
        inArray(classSessions.id, classIds),
        isNotNull(classSessions.liveStartedAt),
        isNull(classSessions.liveEndedAt),
      ),
    );
  return new Set(rows.map((row) => row.id));
}

export async function startClassLiveSession(input: { classId: string; teacherUserId: string }) {
  await db
    .update(classSessions)
    .set({
      liveStartedAt: sql`coalesce(case when ${classSessions.liveEndedAt} is null then ${classSessions.liveStartedAt} end, now())`,
      liveStartedByUserId: input.teacherUserId,
      liveEndedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, input.classId));
  return getClassLiveSession(input.classId);
}

export async function endClassLiveSession(classId: string) {
  const ended = await db
    .update(classSessions)
    .set({ liveEndedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(classSessions.id, classId),
        isNotNull(classSessions.liveStartedAt),
        isNull(classSessions.liveEndedAt),
      ),
    )
    .returning({ id: classSessions.id });
  return ended.length > 0;
}
