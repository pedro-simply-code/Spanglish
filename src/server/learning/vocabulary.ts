import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import type { StudentWord } from "@/lib/learning-types";
import { db } from "@/server/db";
import { classSessions, studentWords } from "@/server/db/schema";

/*
 * The student's word list with Leitner spaced repetition: a correct review
 * moves a word up one box (longer wait), a miss sends it back to box 0.
 */

/** Days until the next review for each box. */
const BOX_INTERVAL_DAYS = [0, 1, 3, 7, 14, 30];
export const LEARNED_BOX = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function listStudentWords(studentId: string): Promise<StudentWord[]> {
  const rows = await db
    .select()
    .from(studentWords)
    .where(eq(studentWords.studentId, studentId))
    .orderBy(desc(studentWords.createdAt));
  const sessionIds = [...new Set(rows.map((row) => row.sourceSessionId).filter(Boolean) as string[])];
  const topics = sessionIds.length
    ? await db
        .select({ id: classSessions.id, topic: classSessions.topic })
        .from(classSessions)
        .where(inArray(classSessions.id, sessionIds))
    : [];
  const topicById = new Map(topics.map((row) => [row.id, row.topic]));
  return rows.map((row) => ({
    id: row.id,
    term: row.term,
    translation: row.translation,
    example: row.example,
    sourceSessionId: row.sourceSessionId,
    sourceTopic: row.sourceSessionId ? (topicById.get(row.sourceSessionId) ?? null) : null,
    box: row.box,
    dueAt: row.dueAt.toISOString(),
    reviewCount: row.reviewCount,
    correctCount: row.correctCount,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function addStudentWord(
  studentId: string,
  input: { term: string; translation: string; example?: string },
) {
  const term = String(input.term ?? "").trim().slice(0, 200);
  if (!term) return false;
  await db.insert(studentWords).values({
    id: `sw-${randomUUID()}`,
    studentId,
    term,
    translation: String(input.translation ?? "").trim().slice(0, 300),
    example: String(input.example ?? "").trim().slice(0, 500),
  });
  return true;
}

export async function deleteStudentWord(studentId: string, wordId: string) {
  await db
    .delete(studentWords)
    .where(and(eq(studentWords.id, wordId), eq(studentWords.studentId, studentId)));
}

/** Records one flashcard answer and schedules the next review. */
export async function reviewStudentWord(studentId: string, wordId: string, knewIt: boolean) {
  const [row] = await db
    .select()
    .from(studentWords)
    .where(and(eq(studentWords.id, wordId), eq(studentWords.studentId, studentId)))
    .limit(1);
  if (!row) return null;
  const box = knewIt ? Math.min(row.box + 1, BOX_INTERVAL_DAYS.length - 1) : 0;
  const now = new Date();
  const dueAt = new Date(now.getTime() + (BOX_INTERVAL_DAYS[box] ?? 0) * DAY_MS);
  await db
    .update(studentWords)
    .set({
      box,
      dueAt,
      lastReviewedAt: now,
      reviewCount: row.reviewCount + 1,
      correctCount: row.correctCount + (knewIt ? 1 : 0),
    })
    .where(eq(studentWords.id, row.id));
  return { box, dueAt: dueAt.toISOString() };
}

/** Words due for review now, oldest due first. */
export async function listDueWordIds(studentId: string) {
  const rows = await db
    .select({ id: studentWords.id, dueAt: studentWords.dueAt })
    .from(studentWords)
    .where(eq(studentWords.studentId, studentId))
    .orderBy(asc(studentWords.dueAt));
  const now = Date.now();
  return rows.filter((row) => row.dueAt.getTime() <= now).map((row) => row.id);
}
