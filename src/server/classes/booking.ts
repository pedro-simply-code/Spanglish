import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import { decideClassChange, type LiveClass } from "@/features/classes";
import { isAppLocale } from "@/i18n/config";
import type { AuthSession } from "@/lib/auth-types";
import { hasRole, normalizeRoles } from "@/lib/auth-roles";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { isSlotFree } from "@/server/classes/availability";
import { getClassView, getSessionAccess } from "@/server/classes/class-repository";
import { getClassPolicy } from "@/server/classes/class-policy";
import { getActivePairForUser } from "@/server/classes/pairs";
import {
  holderFor,
  isExclusionViolation,
  rowsOf,
  type ClassKind,
} from "@/server/credits/credits";
import { db } from "@/server/db";
import {
  classChangeRequests,
  classParticipants,
  classSessions,
  teacherProfiles,
  users,
  type ClassCancellation,
} from "@/server/db/schema";
import { sendClassNotice } from "@/server/email/class-notices";

/*
 * Booking, cancelling and rescheduling classes. Used by the web Server
 * Actions and the /api/v1 endpoints.
 *
 * Guarantees:
 * - A booking spends exactly one credit, or nothing happens (one statement).
 * - A teacher never has two overlapping scheduled classes: the database
 *   exclusion constraint rejects the second one even under concurrency.
 * - A cancellation in time (or by the teacher/staff) returns the credit to
 *   the account it came from.
 * - Moving a paired class needs the partner's acceptance (24 h).
 */

export type BookingErrorCode =
  | "TEACHER_NOT_FOUND"
  | "TOPIC_TOO_SHORT"
  | "NOT_PAIRED"
  | "SLOT_UNAVAILABLE"
  | "NO_CREDITS"
  | "SLOT_TAKEN"
  | "CLASS_NOT_FOUND"
  | "CHANGE_NOT_ALLOWED"
  | "REQUEST_PENDING"
  | "REQUEST_NOT_FOUND"
  | "SAVE_FAILED"
  | "NOT_STUDENT"
  | "TRIAL_USED"
  | "INVALID_DURATION";

export type BookingResult<T = LiveClass> =
  | { ok: true; title: string; message: string; liveClass: T }
  | { ok: false; code: BookingErrorCode; title: string; message: string };

const TEACHER_OVERLAP = "class_sessions_teacher_no_overlap";
const CHANGE_REQUEST_HOURS = 24;

function fail(code: BookingErrorCode, title: string, message: string): BookingResult<never> {
  return { ok: false, code, title, message };
}

async function bookableTeacher(teacherId: string) {
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      roles: users.roles,
      bookable: teacherProfiles.bookable,
    })
    .from(users)
    .leftJoin(teacherProfiles, eq(teacherProfiles.userId, users.id))
    .where(eq(users.id, teacherId))
    .limit(1);
  if (!row || !normalizeRoles(row.roles).includes("teacher") || row.bookable === false) {
    return null;
  }
  return row;
}

function idList(ids: string[]) {
  return sql`ARRAY[${sql.join(
    ids.map((id) => sql`${id}`),
    sql`, `,
  )}]::text[]`;
}

/** Whether this student has not used their one trial lesson yet (including canceled trial bookings). */
export async function studentTrialLessonAvailable(studentId: string) {
  const [row] = await db
    .select({ id: classSessions.id })
    .from(classSessions)
    .where(
      and(
        eq(classSessions.billingKind, "trial"),
        sql`(
          ${classSessions.bookedByUserId} = ${studentId}
          OR EXISTS (
            SELECT 1 FROM ${classParticipants} cp
            WHERE cp.session_id = ${classSessions.id} AND cp.user_id = ${studentId}
          )
        )`,
      ),
    )
    .limit(1);
  return !row;
}

/** Demo/trial: no credit spent; teacher is paid at trial % when the class ends. */
export async function bookTrialClass(
  actor: AuthSession,
  input: { teacherId: string; startsAt: string; durationMinutes: 25 | 50; topic: string },
): Promise<BookingResult> {
  const t = await getTranslations("ops.booking");
  if (!hasRole(actor.roles, "student")) {
    return fail("NOT_STUDENT", t("notStudentTitle"), t("notStudentMessage"));
  }
  if (!(await studentTrialLessonAvailable(actor.userId))) {
    return fail("TRIAL_USED", t("trialUsedTitle"), t("trialUsedMessage"));
  }
  if (input.durationMinutes !== 25 && input.durationMinutes !== 50) {
    return fail("INVALID_DURATION", t("invalidDurationTitle"), t("invalidDurationMessage"));
  }

  const teacher = await bookableTeacher(input.teacherId);
  if (!teacher) {
    return fail("TEACHER_NOT_FOUND", t("teacherNotFoundTitle"), t("teacherNotFoundMessage"));
  }

  const topic = input.topic.trim().slice(0, 140);
  if (topic.length < 3) {
    return fail("TOPIC_TOO_SHORT", t("topicTooShortTitle"), t("topicTooShortMessage"));
  }

  const startsAt = new Date(input.startsAt);
  if (
    Number.isNaN(startsAt.getTime()) ||
    !(await isSlotFree({
      teacherId: teacher.id,
      startsAt,
      durationMinutes: input.durationMinutes,
      studentIds: [actor.userId],
    }))
  ) {
    return fail("SLOT_UNAVAILABLE", t("slotUnavailableTitle"), t("slotUnavailableMessage"));
  }

  const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60_000);
  const sessionId = randomUUID();
  const description = t("trialDescription", { minutes: input.durationMinutes, teacher: teacher.name });
  const agenda = JSON.stringify([t("trialAgenda1"), t("trialAgenda2"), t("trialAgenda3")]);
  const outcomes = JSON.stringify([t("trialOutcome1"), t("trialOutcome2")]);

  try {
    await db.insert(classSessions).values({
      id: sessionId,
      teacherId: teacher.id,
      classType: "one-on-one",
      billingKind: "trial",
      durationMinutes: input.durationMinutes,
      startsAt,
      endsAt,
      status: "scheduled",
      bookedByUserId: actor.userId,
      topic,
      description,
      agenda: JSON.parse(agenda),
      outcomes: JSON.parse(outcomes),
    });
    await db.insert(classParticipants).values({ sessionId, userId: actor.userId });
  } catch (error) {
    if (isExclusionViolation(error, TEACHER_OVERLAP)) {
      return fail("SLOT_TAKEN", t("slotTakenTitle"), t("slotTakenMessage"));
    }
    throw error;
  }

  const liveClass = await getClassView(sessionId);
  await recordAuditEvent({
    action: "class.booked",
    actorUserId: actor.userId,
    targetType: "class",
    targetId: sessionId,
    metadata: { teacherId: teacher.id, startsAt: startsAt.toISOString(), trial: true, durationMinutes: input.durationMinutes },
  });
  sendClassNotice({
    type: "booked",
    recipientIds: [teacher.id],
    actorName: actor.name,
    topic,
    startsAt,
    durationMinutes: input.durationMinutes,
    classId: sessionId,
  });
  return {
    ok: true,
    title: t("trialBookedTitle"),
    message: t("trialBookedMessage"),
    liveClass: liveClass!,
  };
}

export async function bookClass(
  actor: AuthSession,
  input: { teacherId: string; startsAt: string; kind: ClassKind; topic: string },
): Promise<BookingResult> {
  const t = await getTranslations("ops.booking");
  const teacher = await bookableTeacher(input.teacherId);
  if (!teacher) {
    return fail("TEACHER_NOT_FOUND", t("teacherNotFoundTitle"), t("teacherNotFoundMessage"));
  }

  const topic = input.topic.trim().slice(0, 140);
  if (topic.length < 3) {
    return fail("TOPIC_TOO_SHORT", t("topicTooShortTitle"), t("topicTooShortMessage"));
  }

  const pair = input.kind.classType === "paired" ? await getActivePairForUser(actor.userId) : null;
  if (input.kind.classType === "paired" && !pair) {
    return fail("NOT_PAIRED", t("notPairedTitle"), t("notPairedMessage"));
  }

  const studentIds = pair ? [actor.userId, pair.partnerId] : [actor.userId];
  const startsAt = new Date(input.startsAt);
  if (
    Number.isNaN(startsAt.getTime()) ||
    !(await isSlotFree({
      teacherId: teacher.id,
      startsAt,
      durationMinutes: input.kind.durationMinutes,
      studentIds,
    }))
  ) {
    return fail("SLOT_UNAVAILABLE", t("slotUnavailableTitle"), t("slotUnavailableMessage"));
  }

  const holder = holderFor({ classType: input.kind.classType, userId: actor.userId, pairId: pair?.id })!;
  const endsAt = new Date(startsAt.getTime() + input.kind.durationMinutes * 60_000);
  const sessionId = randomUUID();
  const { referenceCreditValueCents } = await import("@/server/pricing/credit-value");
  const catalogFallbackCents = await referenceCreditValueCents(input.kind);
  const label = t(input.kind.classType === "paired" ? "kindPaired" : "kindIndividual");
  const description = t("classDescription", { minutes: input.kind.durationMinutes, kind: label, teacher: teacher.name });
  const agenda = JSON.stringify([t("agenda1"), t("agenda2"), t("agenda3")]);
  const outcomes = JSON.stringify([t("outcome1"), t("outcome2")]);

  let booked = 0;
  try {
    const result = await db.execute(sql`
      WITH pick AS (
        SELECT id, avg_credit_value_cents
        FROM credit_accounts
        WHERE holder = ${holder}
          AND class_type = ${input.kind.classType}
          AND duration_minutes = ${input.kind.durationMinutes}
          AND balance >= 1
      ), debit AS (
        UPDATE credit_accounts
        SET balance = balance - 1, updated_at = now()
        FROM pick
        WHERE credit_accounts.id = pick.id
        RETURNING credit_accounts.id,
          CASE
            WHEN COALESCE(pick.avg_credit_value_cents, 0) > 0 THEN pick.avg_credit_value_cents
            ELSE ${catalogFallbackCents}
          END AS credit_value_cents
      ), session AS (
        INSERT INTO class_sessions (
          id, teacher_id, class_type, duration_minutes, starts_at, ends_at, status,
          pair_id, booked_by_user_id, credit_account_id, credit_value_cents, topic, description, agenda, outcomes
        )
        SELECT ${sessionId}, ${teacher.id}, ${input.kind.classType}, ${input.kind.durationMinutes},
               ${startsAt.toISOString()}::timestamptz, ${endsAt.toISOString()}::timestamptz, 'scheduled',
               ${pair?.id ?? null}, ${actor.userId}, debit.id, debit.credit_value_cents, ${topic}, ${description},
               ${agenda}::jsonb, ${outcomes}::jsonb
        FROM debit
        RETURNING id, credit_account_id
      ), people AS (
        INSERT INTO class_participants (session_id, user_id)
        SELECT session.id, student FROM session, unnest(${idList(studentIds)}) AS student
        RETURNING user_id
      ), entry AS (
        INSERT INTO credit_transactions (id, account_id, delta, reason, session_id, actor_user_id)
        SELECT ${randomUUID()}, session.credit_account_id, -1, 'booking', session.id, ${actor.userId}
        FROM session
        RETURNING id
      )
      SELECT count(*)::int AS booked FROM session
    `);
    booked = Number(rowsOf<{ booked: number }>(result)[0]?.booked ?? 0);
  } catch (error) {
    if (isExclusionViolation(error, TEACHER_OVERLAP)) {
      return fail("SLOT_TAKEN", t("slotTakenTitle"), t("slotTakenMessage"));
    }
    throw error;
  }

  if (!booked) {
    return fail("NO_CREDITS", t("noCreditsTitle"), t("noCreditsMessage", { minutes: input.kind.durationMinutes, kind: label }));
  }

  const liveClass = await getClassView(sessionId);
  await recordAuditEvent({
    action: "class.booked",
    actorUserId: actor.userId,
    targetType: "class",
    targetId: sessionId,
    metadata: { teacherId: teacher.id, startsAt: startsAt.toISOString(), ...input.kind },
  });
  sendClassNotice({
    type: "booked",
    recipientIds: [teacher.id, ...(pair ? [pair.partnerId] : [])],
    actorName: actor.name,
    topic,
    startsAt,
    durationMinutes: input.kind.durationMinutes,
    classId: sessionId,
  });

  return {
    ok: true,
    title: t("classBookedTitle"),
    message: t("classBookedMessage", { topic, teacher: teacher.name }),
    liveClass: liveClass!,
  };
}

type Relation = "participant" | "teacher" | "staff";

async function relationTo(actor: AuthSession, sessionId: string) {
  const access = await getSessionAccess(sessionId);
  if (!access) return null;
  let relation: Relation | null = null;
  if (access.row.teacherId === actor.userId) relation = "teacher";
  else if (access.participantIds.includes(actor.userId)) relation = "participant";
  else if (hasRole(actor.roles, "manager") || hasRole(actor.roles, "admin")) relation = "staff";
  return relation ? { ...access, relation } : null;
}

export async function cancelClass(
  actor: AuthSession,
  input: { classId: string; reason?: string },
): Promise<BookingResult> {
  const t = await getTranslations("ops.booking");
  const access = await relationTo(actor, input.classId);
  const view = access ? await getClassView(input.classId) : null;
  if (!access || !view) {
    return fail("CLASS_NOT_FOUND", t("classNotFoundTitle"), t("classNotFoundMessage"));
  }
  if (access.row.status !== "scheduled" || access.row.startsAt.getTime() <= Date.now()) {
    return fail("CHANGE_NOT_ALLOWED", t("cancelNotAvailableTitle"), t("cancelUpcomingOnly"));
  }

  // Students follow the cutoff; teachers and staff can cancel any upcoming class.
  if (access.relation === "participant") {
    const [tStudent, rawLocale] = await Promise.all([getTranslations("student"), getLocale()]);
    const decision = decideClassChange(
      view,
      "cancel",
      new Date().toISOString(),
      getClassPolicy(),
      tStudent,
      isAppLocale(rawLocale) ? rawLocale : "en",
    );
    if (!decision.allowed) {
      return fail("CHANGE_NOT_ALLOWED", t("cancelNotAvailableTitle"), decision.message);
    }
  }

  const by: ClassCancellation["by"] =
    access.relation === "participant" ? "student" : access.relation === "teacher" ? "teacher" : "staff";
  const reason =
    input.reason?.trim().slice(0, 500) ||
    (by === "student" ? t("reasonStudent") : by === "teacher" ? t("reasonTeacher") : t("reasonStaff"));
  const cancellation: ClassCancellation = {
    by,
    byUserId: actor.userId,
    reason,
    at: new Date().toISOString(),
    creditRefunded: Boolean(access.row.creditAccountId),
  };

  const result = await db.execute(sql`
    WITH canceled AS (
      UPDATE class_sessions
      SET status = 'canceled', cancellation = ${JSON.stringify(cancellation)}::jsonb, updated_at = now()
      WHERE id = ${input.classId} AND status = 'scheduled'
      RETURNING id, credit_account_id
    ), refund AS (
      UPDATE credit_accounts
      SET balance = balance + 1, updated_at = now()
      WHERE id IN (SELECT credit_account_id FROM canceled)
      RETURNING id
    ), entry AS (
      INSERT INTO credit_transactions (id, account_id, delta, reason, session_id, actor_user_id, note)
      SELECT ${randomUUID()}, refund.id, 1, 'refund', ${input.classId}, ${actor.userId}, ${reason}
      FROM refund
      RETURNING id
    ), lapsed AS (
      UPDATE class_change_requests SET status = 'expired'
      WHERE session_id IN (SELECT id FROM canceled) AND status = 'pending'
      RETURNING id
    )
    SELECT count(*)::int AS canceled FROM canceled
  `);
  if (!Number(rowsOf<{ canceled: number }>(result)[0]?.canceled ?? 0)) {
    return fail("CHANGE_NOT_ALLOWED", t("cancelNotAvailableTitle"), t("alreadyCanceled"));
  }

  await recordAuditEvent({
    action: "class.canceled",
    actorUserId: actor.userId,
    targetType: "class",
    targetId: input.classId,
    metadata: { by, reason },
  });
  sendClassNotice({
    type: "canceled",
    recipientIds: [access.row.teacherId, ...access.participantIds].filter((id) => id !== actor.userId),
    actorName: actor.name,
    topic: access.row.topic,
    startsAt: access.row.startsAt,
    durationMinutes: access.row.durationMinutes,
    classId: input.classId,
    reason,
  });

  const updated = await getClassView(input.classId);
  const paired = access.participantIds.length > 1;
  return {
    ok: true,
    title: t("classCanceledTitle"),
    message: `${t("canceledBase", { topic: access.row.topic, paired: paired ? t("canceledPaired") : "" })} ${
      cancellation.creditRefunded ? t("creditReturned") : ""
    }`.trim(),
    liveClass: updated!,
  };
}

async function moveSession(sessionId: string, newStartsAt: Date, durationMinutes: number) {
  const newEndsAt = new Date(newStartsAt.getTime() + durationMinutes * 60_000);
  try {
    const moved = await db
      .update(classSessions)
      .set({
        rescheduledFrom: sql`${classSessions.startsAt}`,
        startsAt: newStartsAt,
        endsAt: newEndsAt,
        updatedAt: new Date(),
      })
      .where(and(eq(classSessions.id, sessionId), eq(classSessions.status, "scheduled")))
      .returning({ id: classSessions.id });
    return moved.length ? "moved" : "gone";
  } catch (error) {
    if (isExclusionViolation(error, TEACHER_OVERLAP)) return "taken";
    throw error;
  }
}

export async function rescheduleClass(
  actor: AuthSession,
  input: { classId: string; startsAt: string },
): Promise<BookingResult> {
  const t = await getTranslations("ops.booking");
  const access = await relationTo(actor, input.classId);
  const view = access ? await getClassView(input.classId) : null;
  if (!access || !view || access.relation === "teacher") {
    return fail("CLASS_NOT_FOUND", t("classNotFoundTitle"), t("classNotFoundMessage"));
  }
  if (access.row.status !== "scheduled") {
    return fail("CHANGE_NOT_ALLOWED", t("rescheduleNotAvailableTitle"), t("canceledCannotMove"));
  }
  if (access.relation === "participant") {
    const [tStudent, rawLocale] = await Promise.all([getTranslations("student"), getLocale()]);
    const decision = decideClassChange(
      view,
      "reschedule",
      new Date().toISOString(),
      getClassPolicy(),
      tStudent,
      isAppLocale(rawLocale) ? rawLocale : "en",
    );
    if (!decision.allowed) {
      return fail("CHANGE_NOT_ALLOWED", t("rescheduleNotAvailableTitle"), decision.message);
    }
  }

  const newStartsAt = new Date(input.startsAt);
  if (
    Number.isNaN(newStartsAt.getTime()) ||
    !(await isSlotFree({
      teacherId: access.row.teacherId,
      startsAt: newStartsAt,
      durationMinutes: access.row.durationMinutes,
      studentIds: access.participantIds,
      ignoreSessionId: access.row.id,
    }))
  ) {
    return fail("SLOT_UNAVAILABLE", t("slotUnavailableTitle"), t("slotUnavailableMessage"));
  }

  const needsPartner = access.relation === "participant" && access.participantIds.length > 1;
  if (needsPartner) {
    const requestId = randomUUID();
    try {
      await db.insert(classChangeRequests).values({
        id: requestId,
        sessionId: access.row.id,
        requestedByUserId: actor.userId,
        newStartsAt,
        expiresAt: new Date(Date.now() + CHANGE_REQUEST_HOURS * 3_600_000),
      });
    } catch {
      return fail("REQUEST_PENDING", t("requestPendingTitle"), t("requestPendingMessage"));
    }
    sendClassNotice({
      type: "reschedule-requested",
      recipientIds: access.participantIds.filter((id) => id !== actor.userId),
      actorName: actor.name,
      topic: access.row.topic,
      startsAt: access.row.startsAt,
      newStartsAt,
      durationMinutes: access.row.durationMinutes,
      classId: access.row.id,
    });
    const updated = await getClassView(access.row.id);
    return {
      ok: true,
      title: t("newTimeProposedTitle"),
      message: t("newTimeProposedMessage"),
      liveClass: updated!,
    };
  }

  const outcome = await moveSession(access.row.id, newStartsAt, access.row.durationMinutes);
  if (outcome === "taken") {
    return fail("SLOT_TAKEN", t("slotTakenTitle"), t("slotTakenMessage"));
  }
  if (outcome === "gone") {
    return fail("CHANGE_NOT_ALLOWED", t("rescheduleNotAvailableTitle"), t("cannotMoveAnymore"));
  }

  await recordAuditEvent({
    action: "class.rescheduled",
    actorUserId: actor.userId,
    targetType: "class",
    targetId: access.row.id,
    metadata: { from: access.row.startsAt.toISOString(), to: newStartsAt.toISOString() },
  });
  sendClassNotice({
    type: "rescheduled",
    recipientIds: [access.row.teacherId, ...access.participantIds].filter((id) => id !== actor.userId),
    actorName: actor.name,
    topic: access.row.topic,
    startsAt: access.row.startsAt,
    newStartsAt,
    durationMinutes: access.row.durationMinutes,
    classId: access.row.id,
  });

  const updated = await getClassView(access.row.id);
  return { ok: true, title: t("classRescheduledTitle"), message: t("classRescheduledMessage"), liveClass: updated! };
}

/** The partner accepts or declines a proposed paired-class time. */
export async function respondToChangeRequest(
  actor: AuthSession,
  input: { classId: string; requestId: string; accept: boolean },
): Promise<BookingResult> {
  const t = await getTranslations("ops.booking");
  const access = await relationTo(actor, input.classId);
  if (!access || access.relation !== "participant") {
    return fail("CLASS_NOT_FOUND", t("classNotFoundTitle"), t("classNotFoundMessage"));
  }

  const [request] = await db
    .select()
    .from(classChangeRequests)
    .where(
      and(
        eq(classChangeRequests.id, input.requestId),
        eq(classChangeRequests.sessionId, input.classId),
        eq(classChangeRequests.status, "pending"),
      ),
    )
    .limit(1);
  if (!request || request.requestedByUserId === actor.userId) {
    return fail("REQUEST_NOT_FOUND", t("nothingToAnswerTitle"), t("nothingToAnswerMessage"));
  }

  const close = (status: "accepted" | "declined" | "expired") =>
    db
      .update(classChangeRequests)
      .set({ status, respondedByUserId: actor.userId, respondedAt: new Date() })
      .where(and(eq(classChangeRequests.id, request.id), eq(classChangeRequests.status, "pending")));

  if (request.expiresAt.getTime() <= Date.now()) {
    await close("expired");
    return fail("REQUEST_NOT_FOUND", t("proposalExpiredTitle"), t("proposalExpiredMessage"));
  }

  const notice = {
    recipientIds: [request.requestedByUserId],
    actorName: actor.name,
    topic: access.row.topic,
    startsAt: access.row.startsAt,
    newStartsAt: request.newStartsAt,
    durationMinutes: access.row.durationMinutes,
    classId: access.row.id,
  };

  if (!input.accept) {
    await close("declined");
    sendClassNotice({ type: "reschedule-declined", ...notice });
    const updated = await getClassView(access.row.id);
    return { ok: true, title: t("proposalDeclinedTitle"), message: t("proposalDeclinedMessage"), liveClass: updated! };
  }

  const stillFree = await isSlotFree({
    teacherId: access.row.teacherId,
    startsAt: request.newStartsAt,
    durationMinutes: access.row.durationMinutes,
    studentIds: access.participantIds,
    ignoreSessionId: access.row.id,
  });
  const outcome = stillFree
    ? await moveSession(access.row.id, request.newStartsAt, access.row.durationMinutes)
    : "taken";
  if (outcome !== "moved") {
    await close("expired");
    return fail("SLOT_TAKEN", t("timeNoLongerFreeTitle"), t("timeNoLongerFreeMessage"));
  }

  await close("accepted");
  sendClassNotice({ type: "reschedule-accepted", ...notice });
  sendClassNotice({
    type: "rescheduled",
    ...notice,
    recipientIds: [access.row.teacherId],
  });
  const updated = await getClassView(access.row.id);
  return { ok: true, title: t("classMovedTitle"), message: t("classMovedMessage"), liveClass: updated! };
}
