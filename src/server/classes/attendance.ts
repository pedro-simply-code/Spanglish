import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { classParticipants } from "@/server/db/schema";

/*
 * Attendance per student. LiveKit webhooks (participant_joined/left) give
 * real presence; without webhooks, getting a join token counts as joining.
 */

export async function markJoinedFromToken(sessionId: string, userId: string) {
  await db
    .update(classParticipants)
    .set({ firstJoinedAt: sql`coalesce(${classParticipants.firstJoinedAt}, now())` })
    .where(and(eq(classParticipants.sessionId, sessionId), eq(classParticipants.userId, userId)));
}

export async function recordParticipantJoined(sessionId: string, userId: string, at: Date) {
  await db
    .update(classParticipants)
    .set({
      firstJoinedAt: sql`coalesce(${classParticipants.firstJoinedAt}, ${at.toISOString()}::timestamptz)`,
      lastJoinedAt: at,
    })
    .where(and(eq(classParticipants.sessionId, sessionId), eq(classParticipants.userId, userId)));
}

export async function recordParticipantLeft(sessionId: string, userId: string, at: Date) {
  await db
    .update(classParticipants)
    .set({
      lastLeftAt: at,
      lastJoinedAt: null,
      secondsPresent: sql`${classParticipants.secondsPresent} + coalesce(
        greatest(0, extract(epoch from (${at.toISOString()}::timestamptz - ${classParticipants.lastJoinedAt}))::int), 0)`,
    })
    .where(and(eq(classParticipants.sessionId, sessionId), eq(classParticipants.userId, userId)));
}
