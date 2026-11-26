import { and, count, desc, eq, gte, max, sql, sum } from "drizzle-orm";
import type { AuthSession } from "@/lib/auth-types";
import { hasRole } from "@/lib/auth-roles";
import { LESSON_LENGTHS, lessonXp } from "@/lib/lesson";
import { db } from "@/server/db";
import { practiceResults, users } from "@/server/db/schema";
import { getMaterialForViewer } from "@/server/materials/library";

/*
 * Finished practice lessons. Students save their own; the material's author
 * (and staff) see everyone's. The client sends the counts, so they are
 * clamped and the XP is recomputed here.
 */

export type PracticeStats = { attempts: number; bestPercent: number; totalXp: number };

export type PracticeStudentResult = {
  studentId: string;
  name: string;
  attempts: number;
  bestPercent: number;
  lastPercent: number;
  totalXp: number;
  lastAt: string;
};

/** A lesson has at most the longest length plus one retry per exercise. */
const MAX_GRADED = Math.max(...LESSON_LENGTHS);

export async function savePracticeResult(
  actor: AuthSession,
  materialId: string,
  outcome: { correct: number; total: number; seconds: number },
) {
  if (!hasRole(actor.roles, "student")) return { ok: false as const, error: "forbidden" };
  const material = await getMaterialForViewer(actor, materialId);
  if (!material || material.kind !== "practice") return { ok: false as const, error: "not_found" };

  const total = Math.max(1, Math.min(MAX_GRADED, Math.round(Number(outcome.total) || 0)));
  const correct = Math.max(0, Math.min(total, Math.round(Number(outcome.correct) || 0)));
  const seconds = Math.max(0, Math.min(3600, Math.round(Number(outcome.seconds) || 0)));

  // At most one result every 20 seconds per material (double clicks, replays).
  const [recent] = await db
    .select({ id: practiceResults.id })
    .from(practiceResults)
    .where(
      and(
        eq(practiceResults.studentUserId, actor.userId),
        eq(practiceResults.materialId, materialId),
        gte(practiceResults.createdAt, sql`now() - interval '20 seconds'`),
      ),
    )
    .limit(1);
  if (recent) return { ok: false as const, error: "too_soon" };

  await db.insert(practiceResults).values({
    id: crypto.randomUUID(),
    materialId,
    studentUserId: actor.userId,
    correct,
    total,
    xp: lessonXp(correct),
    seconds,
  });
  return { ok: true as const, stats: await getPracticeStats(actor.userId, materialId) };
}

export async function getPracticeStats(studentId: string, materialId: string): Promise<PracticeStats> {
  const [row] = await db
    .select({
      attempts: count(),
      best: max(sql<number>`round(100.0 * ${practiceResults.correct} / ${practiceResults.total})`),
      xp: sum(practiceResults.xp),
    })
    .from(practiceResults)
    .where(and(eq(practiceResults.studentUserId, studentId), eq(practiceResults.materialId, materialId)));
  return {
    attempts: Number(row?.attempts ?? 0),
    bestPercent: Number(row?.best ?? 0),
    totalXp: Number(row?.xp ?? 0),
  };
}

/** One row per student, best first. Only for the author or staff. */
export async function listPracticeResults(actor: AuthSession, materialId: string): Promise<PracticeStudentResult[]> {
  const material = await getMaterialForViewer(actor, materialId);
  const staff = hasRole(actor.roles, "manager") || hasRole(actor.roles, "admin");
  if (!material || (material.ownerId !== actor.userId && !staff)) return [];

  const rows = await db
    .select({
      studentId: practiceResults.studentUserId,
      name: users.name,
      correct: practiceResults.correct,
      total: practiceResults.total,
      xp: practiceResults.xp,
      createdAt: practiceResults.createdAt,
    })
    .from(practiceResults)
    .innerJoin(users, eq(users.id, practiceResults.studentUserId))
    .where(eq(practiceResults.materialId, materialId))
    .orderBy(desc(practiceResults.createdAt))
    .limit(2000);

  const byStudent = new Map<string, PracticeStudentResult>();
  for (const row of rows) {
    const percent = Math.round((100 * row.correct) / Math.max(1, row.total));
    const entry = byStudent.get(row.studentId);
    if (!entry) {
      // Rows come newest first, so the first one is the latest attempt.
      byStudent.set(row.studentId, {
        studentId: row.studentId,
        name: row.name,
        attempts: 1,
        bestPercent: percent,
        lastPercent: percent,
        totalXp: row.xp,
        lastAt: row.createdAt.toISOString(),
      });
    } else {
      entry.attempts += 1;
      entry.bestPercent = Math.max(entry.bestPercent, percent);
      entry.totalXp += row.xp;
    }
  }
  return [...byStudent.values()].sort((a, b) => b.bestPercent - a.bestPercent || b.totalXp - a.totalXp);
}
