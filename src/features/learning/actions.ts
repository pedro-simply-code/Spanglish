"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { ClassVocabItem } from "@/lib/learning-types";
import { getActorWithPermission } from "@/server/auth/session";
import {
  createAssignment,
  deleteAssignment,
  gradeSubmission,
  submitAssignment,
  type LearningResult,
} from "@/server/learning/assignments";
import {
  addClassVocabulary,
  removeClassVocabulary,
  saveClassNotes,
  setClassMaterials,
} from "@/server/learning/class-learning";
import { addStudentWord, deleteStudentWord, reviewStudentWord } from "@/server/learning/vocabulary";

export type LearningActionResult = { ok: boolean; message: string };

async function messageFor(result: LearningResult<unknown>, success: string) {
  const t = await getTranslations("student.learn.actions");
  if (result.ok) return { ok: true, message: success };
  return { ok: false, message: t(`errors.${result.error}`) };
}

async function teacherActor() {
  return getActorWithPermission("classes:join-own");
}

function refreshClass(sessionId: string) {
  revalidatePath(`/classes/${sessionId}`);
  revalidatePath("/lessons");
  revalidatePath("/practice");
  revalidatePath("/vocabulary");
  revalidatePath("/study");
  revalidatePath("/classes");
}

/* ---------- Teacher: after the class ---------- */

export async function saveClassNotesAction(input: {
  sessionId: string;
  recap: string;
  homework: string;
  teacherNote: string;
}): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await teacherActor();
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await saveClassNotes(actor, input);
  if (result.ok) refreshClass(input.sessionId);
  return messageFor(result, t("notesSaved"));
}

export async function addClassVocabularyAction(input: {
  sessionId: string;
  items: Omit<ClassVocabItem, "id">[];
}): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await teacherActor();
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await addClassVocabulary(actor, input);
  if (result.ok) refreshClass(input.sessionId);
  return messageFor(result, t("wordsAdded", { count: result.ok ? (result.data?.added ?? 0) : 0 }));
}

export async function removeClassVocabularyAction(
  sessionId: string,
  vocabId: string,
): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await teacherActor();
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await removeClassVocabulary(actor, vocabId);
  if (result.ok) refreshClass(sessionId);
  return messageFor(result, t("wordRemoved"));
}

export async function setClassMaterialsAction(input: {
  sessionId: string;
  materialIds: string[];
}): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await teacherActor();
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await setClassMaterials(actor, input);
  if (result.ok) {
    refreshClass(input.sessionId);
    revalidatePath("/materials");
  }
  return messageFor(result, t("materialsSaved"));
}

export async function createAssignmentAction(input: {
  sessionId: string;
  materialId: string;
  dueAt?: string | null;
}): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await teacherActor();
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await createAssignment(actor, input);
  if (result.ok) {
    refreshClass(input.sessionId);
    revalidatePath("/teacher/assignments");
  }
  return messageFor(result, t("assigned"));
}

export async function deleteAssignmentAction(
  sessionId: string,
  assignmentId: string,
): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await teacherActor();
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await deleteAssignment(actor, assignmentId);
  if (result.ok) {
    refreshClass(sessionId);
    revalidatePath("/teacher/assignments");
  }
  return messageFor(result, t("assignmentRemoved"));
}

export async function gradeSubmissionAction(input: {
  submissionId: string;
  points: Record<string, number>;
  feedback?: string;
}): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await teacherActor();
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await gradeSubmission(actor, input);
  if (result.ok) {
    revalidatePath("/teacher/assignments");
    revalidatePath("/practice");
  }
  return messageFor(result, t("graded"));
}

/* ---------- Student ---------- */

export async function submitAssignmentAction(input: {
  assignmentId: string;
  answers: Record<string, string>;
}): Promise<LearningActionResult & { score?: number | null; maxScore?: number; graded?: boolean }> {
  const t = await getTranslations("student.learn.actions");
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const result = await submitAssignment(actor, input);
  if (!result.ok) return messageFor(result, "");
  revalidatePath("/practice");
  revalidatePath(`/practice/${input.assignmentId}`);
  revalidatePath("/home");
  const data = result.data!;
  return {
    ok: true,
    message: data.graded
      ? t("submittedGraded", { score: data.score ?? 0, total: data.maxScore })
      : t("submittedPending"),
    ...data,
  };
}

export async function addWordAction(input: {
  term: string;
  translation: string;
  example?: string;
}): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  const ok = await addStudentWord(actor.userId, input);
  if (ok) revalidatePath("/vocabulary");
  return ok ? { ok, message: t("wordSaved") } : { ok, message: t("errors.invalid") };
}

export async function deleteWordAction(wordId: string): Promise<LearningActionResult> {
  const t = await getTranslations("student.learn.actions");
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: t("errors.forbidden") };
  await deleteStudentWord(actor.userId, wordId);
  revalidatePath("/vocabulary");
  return { ok: true, message: t("wordRemoved") };
}

export async function reviewWordAction(
  wordId: string,
  knewIt: boolean,
): Promise<{ ok: boolean; box?: number; dueAt?: string }> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false };
  const result = await reviewStudentWord(actor.userId, wordId, knewIt);
  return result ? { ok: true, ...result } : { ok: false };
}
