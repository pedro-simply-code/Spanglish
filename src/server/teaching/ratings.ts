import { and, desc, eq } from "drizzle-orm";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getSessionAccess } from "@/server/classes/class-repository";
import { db } from "@/server/db";
import { classRatings, users } from "@/server/db/schema";

/** Students rate a class they took, from its end until 14 days later. */
export const RATING_WINDOW_DAYS = 14;

export async function getMyRating(sessionId: string, studentId: string) {
  const [row] = await db
    .select({ stars: classRatings.stars, comment: classRatings.comment })
    .from(classRatings)
    .where(and(eq(classRatings.sessionId, sessionId), eq(classRatings.studentId, studentId)))
    .limit(1);
  return row ?? null;
}

export async function rateClass(
  actor: AuthSession,
  input: { classId: string; stars: number; comment?: string },
) {
  const stars = Math.round(Number(input.stars));
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    return { ok: false as const, message: "Choose 1 to 5 stars." };
  }
  const access = await getSessionAccess(input.classId);
  if (!access || !access.participantIds.includes(actor.userId)) {
    return { ok: false as const, message: "You can only rate classes you took." };
  }
  const ended = access.row.endsAt.getTime();
  if (access.row.status !== "scheduled" || ended > Date.now()) {
    return { ok: false as const, message: "You can rate the class after it ends." };
  }
  if (Date.now() - ended > RATING_WINDOW_DAYS * 86_400_000) {
    return { ok: false as const, message: `Ratings close ${RATING_WINDOW_DAYS} days after the class.` };
  }

  const comment = input.comment?.trim().slice(0, 1000) || null;
  await db
    .insert(classRatings)
    .values({ sessionId: input.classId, studentId: actor.userId, teacherId: access.row.teacherId, stars, comment })
    .onConflictDoUpdate({
      target: [classRatings.sessionId, classRatings.studentId],
      set: { stars, comment, createdAt: new Date() },
    });
  await recordAuditEvent({
    action: "class.rated",
    actorUserId: actor.userId,
    targetType: "class",
    targetId: input.classId,
    metadata: { stars },
  });
  return { ok: true as const, message: "Thanks for your rating." };
}

export type RecentRating = { stars: number; comment: string | null; studentName: string; createdAt: string };

export async function listRecentRatings(teacherId: string, limit = 5): Promise<RecentRating[]> {
  const rows = await db
    .select({
      stars: classRatings.stars,
      comment: classRatings.comment,
      createdAt: classRatings.createdAt,
      studentName: users.name,
    })
    .from(classRatings)
    .innerJoin(users, eq(users.id, classRatings.studentId))
    .where(eq(classRatings.teacherId, teacherId))
    .orderBy(desc(classRatings.createdAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
