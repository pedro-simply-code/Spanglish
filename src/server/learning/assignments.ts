import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { AuthSession } from "@/lib/auth-types";
import type {
  AssignmentDetail,
  AssignmentSummary,
  LearningQuestion,
  QuestionType,
  SubmissionView,
} from "@/lib/learning-types";
import { db } from "@/server/db";
import {
  assignmentSubmissions,
  assignments,
  classParticipants,
  classSessions,
  materials,
  users,
  type SubmissionAnswer,
} from "@/server/db/schema";
import { classRelation, isStaffActor } from "@/server/learning/access";

/*
 * Practice forms assigned from a class. Multiple-choice answers are graded
 * on submit; the other question types wait for the teacher.
 */

const QUESTION_TYPES: QuestionType[] = ["multiple-choice", "short-answer", "speaking", "listening"];

/** Questions stored in a form material's payload, normalized and given ids. */
export function questionsFromPayload(payload: unknown): LearningQuestion[] {
  const raw = (payload as { questions?: unknown } | null)?.questions;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, index): LearningQuestion | null => {
      const q = item as Partial<LearningQuestion>;
      const prompt = String(q?.prompt ?? "").trim();
      if (!prompt) return null;
      const type = QUESTION_TYPES.includes(q.type as QuestionType)
        ? (q.type as QuestionType)
        : "short-answer";
      const options = Array.isArray(q.options)
        ? q.options.map((option) => String(option).trim()).filter(Boolean)
        : undefined;
      const isChoice = type === "multiple-choice" && options && options.length >= 2;
      const correct = Number(q.correctOption);
      return {
        id: String(q.id ?? `q${index + 1}`),
        type: isChoice ? "multiple-choice" : type === "multiple-choice" ? "short-answer" : type,
        prompt,
        options: isChoice ? options : undefined,
        correctOption:
          isChoice && Number.isInteger(correct) && correct >= 0 && correct < options.length
            ? correct
            : undefined,
        points: Math.max(1, Math.min(100, Math.round(Number(q.points) || 1))),
      };
    })
    .filter((q): q is LearningQuestion => Boolean(q));
}

const maxScoreOf = (questions: LearningQuestion[]) =>
  questions.reduce((sum, q) => sum + q.points, 0);

/** Multiple choice with a known answer is graded automatically. */
const autoGraded = (q: LearningQuestion) =>
  q.type === "multiple-choice" && q.correctOption !== undefined;

type AssignmentRow = typeof assignments.$inferSelect;
type SubmissionRow = typeof assignmentSubmissions.$inferSelect;

async function namesFor(ids: string[]) {
  if (!ids.length) return new Map<string, string>();
  const rows = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.id, [...new Set(ids)]));
  return new Map(rows.map((row) => [row.id, row.name]));
}

function toSubmission(row: SubmissionRow, studentName: string): SubmissionView {
  return {
    id: row.id,
    studentId: row.studentId,
    studentName,
    status: row.status,
    score: row.score,
    maxScore: row.maxScore,
    feedback: row.feedback,
    submittedAt: row.submittedAt.toISOString(),
    gradedAt: row.gradedAt?.toISOString() ?? null,
    answers: row.answers,
  };
}

/** Summaries with class info, counts, and (for students) their own submission. */
async function summarize(
  rows: AssignmentRow[],
  viewerStudentId: string | null,
): Promise<AssignmentSummary[]> {
  if (!rows.length) return [];
  const sessionIds = [...new Set(rows.map((row) => row.sessionId))];
  const ids = rows.map((row) => row.id);
  const [sessions, participants, submissions, teacherNames] = await Promise.all([
    db
      .select({ id: classSessions.id, topic: classSessions.topic, startsAt: classSessions.startsAt })
      .from(classSessions)
      .where(inArray(classSessions.id, sessionIds)),
    db
      .select({ sessionId: classParticipants.sessionId, userId: classParticipants.userId })
      .from(classParticipants)
      .where(inArray(classParticipants.sessionId, sessionIds)),
    db.select().from(assignmentSubmissions).where(inArray(assignmentSubmissions.assignmentId, ids)),
    namesFor(rows.map((row) => row.teacherId)),
  ]);
  const sessionById = new Map(sessions.map((row) => [row.id, row]));
  const studentNames = viewerStudentId ? await namesFor([viewerStudentId]) : new Map<string, string>();

  return rows.map((row) => {
    const session = sessionById.get(row.sessionId);
    const own = submissions.filter((item) => item.assignmentId === row.id);
    const mine = viewerStudentId ? own.find((item) => item.studentId === viewerStudentId) : undefined;
    return {
      id: row.id,
      sessionId: row.sessionId,
      classTopic: session?.topic ?? "",
      classStartsAt: session?.startsAt.toISOString() ?? row.createdAt.toISOString(),
      materialId: row.materialId,
      title: row.title,
      instructions: row.instructions,
      questionCount: row.questions.length,
      maxScore: maxScoreOf(row.questions),
      dueAt: row.dueAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      teacherName: teacherNames.get(row.teacherId) ?? "",
      totalStudents: participants.filter((item) => item.sessionId === row.sessionId).length,
      submittedCount: own.length,
      gradedCount: own.filter((item) => item.status === "graded").length,
      mySubmission: mine ? toSubmission(mine, studentNames.get(mine.studentId) ?? "") : null,
      overdue: row.dueAt ? row.dueAt.getTime() < Date.now() : false,
    };
  });
}

/* ---------- Teacher ---------- */

export type LearningResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: "not_found" | "forbidden" | "invalid" | "already_graded" };

export async function createAssignment(
  actor: AuthSession,
  input: { sessionId: string; materialId: string; dueAt?: string | null; instructions?: string },
): Promise<LearningResult<{ id: string }>> {
  const relation = await classRelation(actor, input.sessionId);
  if (!relation) return { ok: false, error: "not_found" };
  if (!relation.canEdit) return { ok: false, error: "forbidden" };

  const [material] = await db.select().from(materials).where(eq(materials.id, input.materialId)).limit(1);
  if (!material || material.kind !== "form") return { ok: false, error: "invalid" };
  const visible =
    material.authorUserId === actor.userId || material.visibility !== "private" || isStaffActor(actor);
  if (!visible) return { ok: false, error: "forbidden" };

  const questions = questionsFromPayload(material.payload);
  if (!questions.length) return { ok: false, error: "invalid" };

  const due = input.dueAt ? new Date(input.dueAt) : null;
  const id = `asg-${randomUUID()}`;
  await db.insert(assignments).values({
    id,
    sessionId: input.sessionId,
    materialId: material.id,
    teacherId: relation.row.teacherId,
    title: material.title,
    instructions: String(input.instructions ?? material.description ?? "").trim().slice(0, 2000),
    questions,
    dueAt: due && !Number.isNaN(due.getTime()) ? due : null,
  });
  return { ok: true, data: { id } };
}

export async function deleteAssignment(actor: AuthSession, assignmentId: string): Promise<LearningResult> {
  const [row] = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!row) return { ok: false, error: "not_found" };
  const relation = await classRelation(actor, row.sessionId);
  if (!relation?.canEdit) return { ok: false, error: "forbidden" };
  await db.delete(assignments).where(eq(assignments.id, assignmentId));
  return { ok: true };
}

/** Assignments the teacher created (staff: all), newest first. */
export async function listAssignmentsForTeacher(actor: AuthSession, limit = 300) {
  const rows = await db
    .select()
    .from(assignments)
    .where(isStaffActor(actor) ? undefined : eq(assignments.teacherId, actor.userId))
    .orderBy(desc(assignments.createdAt))
    .limit(limit);
  return summarize(rows, null);
}

/** Assignment with questions and every submission (teacher of the class or staff). */
export async function getAssignmentForTeacher(
  actor: AuthSession,
  assignmentId: string,
): Promise<AssignmentDetail | null> {
  const [row] = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!row) return null;
  const relation = await classRelation(actor, row.sessionId);
  if (!relation?.canEdit) return null;
  const [summary] = await summarize([row], null);
  const subs = await db
    .select()
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.assignmentId, row.id))
    .orderBy(desc(assignmentSubmissions.submittedAt));
  const names = await namesFor(subs.map((item) => item.studentId));
  return {
    ...summary!,
    questions: row.questions,
    submissions: subs.map((item) => toSubmission(item, names.get(item.studentId) ?? "")),
  };
}

/** Teacher grades the open questions and leaves feedback. */
export async function gradeSubmission(
  actor: AuthSession,
  input: { submissionId: string; points: Record<string, number>; feedback?: string },
): Promise<LearningResult> {
  const [sub] = await db
    .select()
    .from(assignmentSubmissions)
    .where(eq(assignmentSubmissions.id, input.submissionId))
    .limit(1);
  if (!sub) return { ok: false, error: "not_found" };
  const [row] = await db.select().from(assignments).where(eq(assignments.id, sub.assignmentId)).limit(1);
  if (!row) return { ok: false, error: "not_found" };
  const relation = await classRelation(actor, row.sessionId);
  if (!relation?.canEdit) return { ok: false, error: "forbidden" };

  const answers: SubmissionAnswer[] = row.questions.map((q) => {
    const previous = sub.answers.find((a) => a.questionId === q.id);
    const given = input.points[q.id];
    const points = autoGraded(q)
      ? (previous?.points ?? 0)
      : Math.max(0, Math.min(q.points, Math.round(Number(given ?? previous?.points ?? 0))));
    return { questionId: q.id, answer: previous?.answer ?? "", points };
  });
  const score = answers.reduce((sum, a) => sum + (a.points ?? 0), 0);
  await db
    .update(assignmentSubmissions)
    .set({
      answers,
      score,
      status: "graded",
      feedback: String(input.feedback ?? "").trim().slice(0, 4000) || null,
      gradedAt: new Date(),
    })
    .where(eq(assignmentSubmissions.id, sub.id));
  return { ok: true };
}

/* ---------- Student ---------- */

async function studentSessionIds(studentId: string) {
  const rows = await db
    .select({ id: classParticipants.sessionId })
    .from(classParticipants)
    .where(eq(classParticipants.userId, studentId));
  return rows.map((row) => row.id);
}

/** Every assignment from the student's classes, newest first, with their submission. */
export async function listAssignmentsForStudent(studentId: string) {
  const sessionIds = await studentSessionIds(studentId);
  if (!sessionIds.length) return [];
  const rows = await db
    .select()
    .from(assignments)
    .where(inArray(assignments.sessionId, sessionIds))
    .orderBy(desc(assignments.createdAt));
  return summarize(rows, studentId);
}

/** The form to answer (correct answers hidden until it is graded). */
export async function getAssignmentForStudent(
  actor: AuthSession,
  assignmentId: string,
): Promise<AssignmentDetail | null> {
  const [row] = await db.select().from(assignments).where(eq(assignments.id, assignmentId)).limit(1);
  if (!row) return null;
  const relation = await classRelation(actor, row.sessionId);
  if (!relation?.isParticipant) return null;
  const [summary] = await summarize([row], actor.userId);
  const graded = summary!.mySubmission?.status === "graded";
  return {
    ...summary!,
    questions: row.questions.map((q) => (graded ? q : { ...q, correctOption: undefined })),
    submissions: summary!.mySubmission ? [summary!.mySubmission] : [],
  };
}

export async function submitAssignment(
  actor: AuthSession,
  input: { assignmentId: string; answers: Record<string, string> },
): Promise<LearningResult<{ score: number | null; maxScore: number; graded: boolean }>> {
  const [row] = await db.select().from(assignments).where(eq(assignments.id, input.assignmentId)).limit(1);
  if (!row) return { ok: false, error: "not_found" };
  const relation = await classRelation(actor, row.sessionId);
  if (!relation?.isParticipant) return { ok: false, error: "forbidden" };

  const [existing] = await db
    .select()
    .from(assignmentSubmissions)
    .where(
      and(
        eq(assignmentSubmissions.assignmentId, row.id),
        eq(assignmentSubmissions.studentId, actor.userId),
      ),
    )
    .limit(1);
  if (existing?.status === "graded") return { ok: false, error: "already_graded" };

  const answers: SubmissionAnswer[] = row.questions.map((q) => {
    const answer = String(input.answers[q.id] ?? "").trim().slice(0, 4000);
    const points = autoGraded(q) ? (Number(answer) === q.correctOption ? q.points : 0) : null;
    return { questionId: q.id, answer, points };
  });
  if (answers.some((a) => !a.answer)) return { ok: false, error: "invalid" };

  const allAuto = row.questions.every(autoGraded);
  const maxScore = maxScoreOf(row.questions);
  const score = allAuto ? answers.reduce((sum, a) => sum + (a.points ?? 0), 0) : null;
  const values = {
    answers,
    maxScore,
    score,
    status: allAuto ? ("graded" as const) : ("submitted" as const),
    submittedAt: new Date(),
    gradedAt: allAuto ? new Date() : null,
  };
  if (existing) {
    await db.update(assignmentSubmissions).set(values).where(eq(assignmentSubmissions.id, existing.id));
  } else {
    await db.insert(assignmentSubmissions).values({
      id: `sub-${randomUUID()}`,
      assignmentId: row.id,
      studentId: actor.userId,
      ...values,
    });
  }
  return { ok: true, data: { score, maxScore, graded: allAuto } };
}
