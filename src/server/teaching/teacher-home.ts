import { and, count, desc, eq, gte, inArray, isNull, lt, ne, sql } from "drizzle-orm";
import { connection } from "next/server";
import { appNowDate } from "@/lib/app-clock";
import { db } from "@/server/db";
import {
  assignments,
  assignmentSubmissions,
  classParticipants,
  classSessions,
  classSummaries,
  materials,
  practiceResults,
  teacherAvailability,
  users,
} from "@/server/db/schema";

/*
 * What the teacher's home needs beyond classes and earnings: work waiting
 * for them (grading, class notes, rejected materials, no availability), the
 * last class they taught and what students practiced lately.
 */

export type TeacherLastClass = {
  id: string;
  topic: string;
  startsAt: string;
  students: string[];
  recap: string | null;
  /** The AI summary overview in the viewer's language (null while pending or absent). */
  summary: string | null;
};

export type TeacherPracticeActivity = {
  id: string;
  studentName: string;
  materialId: string;
  materialTitle: string;
  percent: number;
  xp: number;
  createdAt: string;
};

export type TeacherHome = {
  toGrade: number;
  rejectedMaterials: { id: string; title: string }[];
  hasAvailability: boolean;
  lastClass: TeacherLastClass | null;
  practice: TeacherPracticeActivity[];
};

export async function getTeacherHome(teacherId: string, locale: "en" | "es"): Promise<TeacherHome> {
  await connection();
  const now = appNowDate();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [gradeRows, rejectedRows, availabilityRows, lastRows, practiceRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .where(and(eq(assignments.teacherId, teacherId), eq(assignmentSubmissions.status, "submitted"))),
    db
      .select({ id: materials.id, title: materials.title })
      .from(materials)
      .where(
        and(eq(materials.authorUserId, teacherId), eq(materials.moderation, "rejected"), ne(materials.status, "archived")),
      )
      .orderBy(desc(materials.updatedAt))
      .limit(3),
    db.select({ value: count() }).from(teacherAvailability).where(eq(teacherAvailability.teacherId, teacherId)),
    db
      .select({
        id: classSessions.id,
        topic: classSessions.topic,
        startsAt: classSessions.startsAt,
        recap: classSessions.recap,
        summaryEn: classSummaries.contentEn,
        summaryEs: classSummaries.contentEs,
        summaryStatus: classSummaries.status,
      })
      .from(classSessions)
      .leftJoin(classSummaries, eq(classSummaries.sessionId, classSessions.id))
      .where(
        and(
          eq(classSessions.teacherId, teacherId),
          lt(classSessions.endsAt, now),
          ne(classSessions.status, "canceled"),
        ),
      )
      .orderBy(desc(classSessions.startsAt))
      .limit(1),
    db
      .select({
        id: practiceResults.id,
        studentName: users.name,
        materialId: materials.id,
        materialTitle: materials.title,
        correct: practiceResults.correct,
        total: practiceResults.total,
        xp: practiceResults.xp,
        createdAt: practiceResults.createdAt,
      })
      .from(practiceResults)
      .innerJoin(materials, eq(materials.id, practiceResults.materialId))
      .innerJoin(users, eq(users.id, practiceResults.studentUserId))
      .where(and(eq(materials.authorUserId, teacherId), gte(practiceResults.createdAt, weekAgo)))
      .orderBy(desc(practiceResults.createdAt))
      .limit(5),
  ]);

  const last = lastRows[0];
  let lastClass: TeacherLastClass | null = null;
  if (last) {
    const students = await db
      .select({ name: users.name })
      .from(classParticipants)
      .innerJoin(users, eq(users.id, classParticipants.userId))
      .where(and(eq(classParticipants.sessionId, last.id), ne(classParticipants.userId, teacherId)));
    const content = last.summaryStatus === "ready" ? ((locale === "es" ? last.summaryEs : last.summaryEn) ?? last.summaryEn) : null;
    lastClass = {
      id: last.id,
      topic: last.topic,
      startsAt: last.startsAt.toISOString(),
      students: students.map((row) => row.name),
      recap: last.recap?.trim() || null,
      summary: content?.overview ?? null,
    };
  }

  return {
    toGrade: Number(gradeRows[0]?.value ?? 0),
    rejectedMaterials: rejectedRows,
    hasAvailability: Number(availabilityRows[0]?.value ?? 0) > 0,
    lastClass,
    practice: practiceRows.map((row) => ({
      id: row.id,
      studentName: row.studentName,
      materialId: row.materialId,
      materialTitle: row.materialTitle,
      percent: Math.round((100 * row.correct) / Math.max(1, row.total)),
      xp: row.xp,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}

/* ---------------------------------------------------------------- student */

export type StudentPracticeHome = {
  /** XP earned in practice lessons over the last 7 days. */
  weekXp: number;
  /** Practice sets from their classes they have not finished yet. */
  pending: { id: string; title: string }[];
};

export async function getStudentPracticeHome(studentId: string, attachedMaterialIds: string[]): Promise<StudentPracticeHome> {
  await connection();
  const weekAgo = new Date(appNowDate().getTime() - 7 * 24 * 60 * 60 * 1000);
  const [xpRows, pendingRows] = await Promise.all([
    db
      .select({ xp: sql<number>`coalesce(sum(${practiceResults.xp}), 0)::int` })
      .from(practiceResults)
      .where(and(eq(practiceResults.studentUserId, studentId), gte(practiceResults.createdAt, weekAgo))),
    attachedMaterialIds.length
      ? db
          .select({ id: materials.id, title: materials.title })
          .from(materials)
          .leftJoin(
            practiceResults,
            and(eq(practiceResults.materialId, materials.id), eq(practiceResults.studentUserId, studentId)),
          )
          .where(
            and(
              inArray(materials.id, attachedMaterialIds),
              eq(materials.kind, "practice"),
              eq(materials.status, "published"),
              isNull(practiceResults.id),
            ),
          )
          .orderBy(desc(materials.updatedAt))
          .limit(2)
      : Promise.resolve([]),
  ]);
  return { weekXp: Number(xpRows[0]?.xp ?? 0), pending: pendingRows };
}
