import { and, eq, gt, inArray, ne, or, sql } from "drizzle-orm";
import { appNowDate } from "@/lib/app-clock";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import {
  academyMessages,
  accounts,
  aiConversations,
  assignmentSubmissions,
  classParticipants,
  classroomWaiting,
  classSessions,
  classSummaries,
  classTranscriptSegments,
  recordings,
  sessions,
  studentWords,
  twoFactors,
  users,
  verifications,
} from "@/server/db/schema";
import { deleteRecordingObject } from "@/server/storage/b2";

/*
 * A student deletes their account (Settings → Security). The user row stays,
 * anonymized, so past orders, credits, attendance and teacher pay still add
 * up; everything personal goes: sign-in methods, sessions, conversations with
 * Luna, their lines of class transcripts, words, homework answers, messages,
 * and the summaries and recordings of classes where they were the only student.
 */

export type DeleteAccountResult =
  | { ok: true }
  | { ok: false; error: "not_student" | "upcoming_classes" | "email_mismatch" };

export const DELETED_NAME = "Deleted user";

export async function deleteStudentAccount(actor: AuthSession, confirmEmail: string): Promise<DeleteAccountResult> {
  // Teachers, managers and the admin have pay, classes or the academy behind
  // their account: the admin handles those by hand.
  if (actor.roles.length !== 1 || actor.roles[0] !== "student") return { ok: false, error: "not_student" };
  if (confirmEmail.trim().toLowerCase() !== actor.email.trim().toLowerCase()) {
    return { ok: false, error: "email_mismatch" };
  }

  const userId = actor.userId;
  const upcoming = await db
    .select({ id: classSessions.id })
    .from(classParticipants)
    .innerJoin(classSessions, eq(classSessions.id, classParticipants.sessionId))
    .where(
      and(
        eq(classParticipants.userId, userId),
        ne(classSessions.status, "canceled"),
        gt(classSessions.endsAt, appNowDate()),
      ),
    )
    .limit(1);
  if (upcoming.length) return { ok: false, error: "upcoming_classes" };

  // Classes where they were the only student: their summary and recordings are about them.
  const ownClasses = await db
    .select({ sessionId: classParticipants.sessionId })
    .from(classParticipants)
    .where(eq(classParticipants.userId, userId));
  const ownIds = ownClasses.map((row) => row.sessionId);
  const soloIds = ownIds.length
    ? (
        await db
          .select({ sessionId: classParticipants.sessionId, students: sql<number>`count(*)::int` })
          .from(classParticipants)
          .where(inArray(classParticipants.sessionId, ownIds))
          .groupBy(classParticipants.sessionId)
      )
        .filter((row) => Number(row.students) === 1)
        .map((row) => row.sessionId)
    : [];

  const soloRecordings = soloIds.length
    ? await db
        .select({ id: recordings.id, objectKey: recordings.objectKey, storage: recordings.storage })
        .from(recordings)
        .where(inArray(recordings.sessionId, soloIds))
    : [];
  for (const recording of soloRecordings) {
    if (recording.storage === "b2" && recording.objectKey) {
      await deleteRecordingObject(recording.objectKey).catch(() => undefined);
    }
  }

  const originalEmail = actor.email;
  await Promise.all([
    db.delete(aiConversations).where(eq(aiConversations.userId, userId)),
    db.delete(classTranscriptSegments).where(eq(classTranscriptSegments.speakerUserId, userId)),
    db.delete(studentWords).where(eq(studentWords.studentId, userId)),
    db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.studentId, userId)),
    db.delete(classroomWaiting).where(eq(classroomWaiting.userId, userId)),
    db
      .delete(academyMessages)
      .where(or(eq(academyMessages.senderUserId, userId), eq(academyMessages.recipientUserId, userId))),
    soloIds.length ? db.delete(classSummaries).where(inArray(classSummaries.sessionId, soloIds)) : null,
    soloRecordings.length
      ? db.delete(recordings).where(inArray(recordings.id, soloRecordings.map((row) => row.id)))
      : null,
    db.delete(verifications).where(eq(verifications.identifier, originalEmail)),
    db.delete(twoFactors).where(eq(twoFactors.userId, userId)),
    db.delete(accounts).where(eq(accounts.userId, userId)),
  ]);

  await db
    .update(users)
    .set({
      name: DELETED_NAME,
      email: `deleted-${userId}@deleted.invalid`,
      emailVerified: false,
      image: null,
      twoFactorEnabled: false,
      timezone: null,
      learningLanguage: null,
      level: null,
      goal: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
  // Last: signs them out everywhere.
  await db.delete(sessions).where(eq(sessions.userId, userId));

  await recordAuditEvent({
    action: "account.deleted",
    actorUserId: userId,
    severity: "warning",
    targetType: "user",
    targetId: userId,
    metadata: { soloClasses: soloIds.length, recordings: soloRecordings.length },
  });
  return { ok: true };
}
