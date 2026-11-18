import { randomUUID } from "node:crypto";
import { asc, eq, inArray } from "drizzle-orm";
import type { AuthSession } from "@/lib/auth-types";
import type { ClassLearning, ClassVocabItem } from "@/lib/learning-types";
import { db } from "@/server/db";
import { assignments, classSessions, classVocabulary, materials, studentWords } from "@/server/db/schema";
import { classRelation, isStaffActor } from "@/server/learning/access";
import {
  listAssignmentsForStudent,
  listAssignmentsForTeacher,
} from "@/server/learning/assignments";
import { listMaterialsByIds } from "@/server/materials/library";
import type { LearningResult } from "@/server/learning/assignments";

/*
 * What a class leaves behind for its students: the teacher's recap and
 * homework, the vocabulary seen, library materials, and practice forms.
 */

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

/** Learning material of a class, for anyone who may see the class. */
export async function getClassLearning(actor: AuthSession, sessionId: string): Promise<ClassLearning | null> {
  const relation = await classRelation(actor, sessionId);
  if (!relation?.canView) return null;

  const [vocabRows, materialRows, assignmentRows] = await Promise.all([
    db
      .select()
      .from(classVocabulary)
      .where(eq(classVocabulary.sessionId, sessionId))
      .orderBy(asc(classVocabulary.createdAt)),
    listMaterialsByIds(relation.row.materialIds ?? []),
    db.select({ id: assignments.id }).from(assignments).where(eq(assignments.sessionId, sessionId)),
  ]);

  let classAssignments: ClassLearning["assignments"] = [];
  if (assignmentRows.length) {
    if (relation.isParticipant) {
      classAssignments = (await listAssignmentsForStudent(actor.userId)).filter(
        (item) => item.sessionId === sessionId,
      );
    } else if (relation.canEdit) {
      classAssignments = (await listAssignmentsForTeacher(actor)).filter(
        (item) => item.sessionId === sessionId,
      );
    }
  }

  return {
    vocabulary: vocabRows.map((row) => ({
      id: row.id,
      term: row.term,
      translation: row.translation,
      example: row.example,
    })),
    assignments: classAssignments,
    materials: materialRows.map((item) => ({
      id: item.id,
      title: item.title,
      kind: item.kind,
      description: item.description,
    })),
  };
}

export async function saveClassNotes(
  actor: AuthSession,
  input: { sessionId: string; recap: string; homework: string; teacherNote: string },
): Promise<LearningResult> {
  const relation = await classRelation(actor, input.sessionId);
  if (!relation) return { ok: false, error: "not_found" };
  if (!relation.canEdit) return { ok: false, error: "forbidden" };
  await db
    .update(classSessions)
    .set({
      recap: clean(input.recap, 8000) || null,
      homework: clean(input.homework, 4000) || null,
      teacherNote: clean(input.teacherNote, 4000) || null,
      updatedAt: new Date(),
    })
    .where(eq(classSessions.id, input.sessionId));
  return { ok: true };
}

/** Adds words to the class and to every student's word list. */
export async function addClassVocabulary(
  actor: AuthSession,
  input: { sessionId: string; items: Omit<ClassVocabItem, "id">[] },
): Promise<LearningResult<{ added: number }>> {
  const relation = await classRelation(actor, input.sessionId);
  if (!relation) return { ok: false, error: "not_found" };
  if (!relation.canEdit) return { ok: false, error: "forbidden" };

  const rows = input.items
    .slice(0, 100)
    .map((item) => ({
      id: `voc-${randomUUID()}`,
      sessionId: input.sessionId,
      term: clean(item.term, 200),
      translation: clean(item.translation, 300),
      example: clean(item.example, 500),
      createdByUserId: actor.userId,
    }))
    .filter((row) => row.term);
  if (!rows.length) return { ok: false, error: "invalid" };

  await db.insert(classVocabulary).values(rows);
  const copies = relation.participantIds.flatMap((studentId) =>
    rows.map((row) => ({
      id: `sw-${randomUUID()}`,
      studentId,
      term: row.term,
      translation: row.translation,
      example: row.example,
      sourceSessionId: input.sessionId,
      sourceVocabId: row.id,
    })),
  );
  if (copies.length) await db.insert(studentWords).values(copies).onConflictDoNothing();
  return { ok: true, data: { added: rows.length } };
}

/** Removes a word from the class (students' untouched copies go with it). */
export async function removeClassVocabulary(actor: AuthSession, vocabId: string): Promise<LearningResult> {
  const [row] = await db.select().from(classVocabulary).where(eq(classVocabulary.id, vocabId)).limit(1);
  if (!row) return { ok: false, error: "not_found" };
  const relation = await classRelation(actor, row.sessionId);
  if (!relation?.canEdit) return { ok: false, error: "forbidden" };
  await db.delete(classVocabulary).where(eq(classVocabulary.id, vocabId));
  return { ok: true };
}

/** Sets the library materials attached to a class. */
export async function setClassMaterials(
  actor: AuthSession,
  input: { sessionId: string; materialIds: string[] },
): Promise<LearningResult> {
  const relation = await classRelation(actor, input.sessionId);
  if (!relation) return { ok: false, error: "not_found" };
  if (!relation.canEdit) return { ok: false, error: "forbidden" };

  const ids = [...new Set(input.materialIds.map(String))].slice(0, 50);
  const rows = ids.length
    ? await db
        .select({
          id: materials.id,
          authorUserId: materials.authorUserId,
          visibility: materials.visibility,
          status: materials.status,
        })
        .from(materials)
        .where(inArray(materials.id, ids))
    : [];
  const allowed = new Set(
    rows
      .filter(
        (row) =>
          row.status === "published" &&
          (row.authorUserId === actor.userId || row.visibility !== "private" || isStaffActor(actor)),
      )
      .map((row) => row.id),
  );
  await db
    .update(classSessions)
    .set({ materialIds: ids.filter((id) => allowed.has(id)), updatedAt: new Date() })
    .where(eq(classSessions.id, input.sessionId));
  return { ok: true };
}
