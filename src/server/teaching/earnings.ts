import { requestTime } from "@/server/request-time";
import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, inArray, isNull, lt, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import type { AuthSession } from "@/lib/auth-types";
import { teacherLevelFor } from "@/lib/teacher-levels";
import {
  classEarning,
  defaultPayoutSettings,
  MIN_TEACHER_PAYOUT_REQUEST_CENTS,
  trialReferenceCents,
  type PayoutSettings,
} from "@/lib/teacher-pay";
import { referenceCreditValueCents } from "@/server/pricing/credit-value";

export {
  classEarning,
  defaultPayoutSettings,
  MIN_TEACHER_PAYOUT_REQUEST_CENTS,
  type PayoutSettings,
} from "@/lib/teacher-pay";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { rowsOf } from "@/server/credits/credits";
import { db } from "@/server/db";
import {
  classSessions,
  payoutBatches,
  payoutSettings,
  teacherEarnings,
  teacherProfiles,
  users,
  type PayoutBatchInitiator,
  type PayoutBatchStatus,
} from "@/server/db/schema";
import { notifyRole, notifyUsers } from "@/server/email/academy-notices";
import { payoutProcessingBusinessDays, payoutProcessingWindowPhrase } from "@/server/teaching/payout-policy";
import { getTeacherStats } from "@/server/teaching/stats";

/*
 * Teacher pay. Every delivered class (scheduled, already ended) earns a share
 * of the credit value booked for that session; the platform take % depends on
 * the teacher level at delivery. Earnings are rows in
 * `teacher_earnings` (one per class), grouped into payout batches that a
 * manager prepares and the admin approves and pays.
 */


export async function getPayoutSettings(): Promise<PayoutSettings> {
  const [row] = await db.select().from(payoutSettings).where(eq(payoutSettings.id, "default")).limit(1);
  if (!row) return defaultPayoutSettings;
  return {
    platformTakeLevel1: row.platformTakeLevel1 ?? defaultPayoutSettings.platformTakeLevel1,
    platformTakeLevel2: row.platformTakeLevel2 ?? defaultPayoutSettings.platformTakeLevel2,
    platformTakeLevel3: row.platformTakeLevel3 ?? defaultPayoutSettings.platformTakeLevel3,
    platformTakeLevel4: row.platformTakeLevel4 ?? defaultPayoutSettings.platformTakeLevel4,
    trialPercent: row.trialPercent,
    trialReference25Cents: row.trialReference25Cents ?? defaultPayoutSettings.trialReference25Cents,
    trialReference50Cents: row.trialReference50Cents ?? defaultPayoutSettings.trialReference50Cents,
  };
}

function validTake(percent: number) {
  return Number.isFinite(percent) && percent >= 0 && percent <= 60;
}

export async function savePayoutSettings(actor: AuthSession, input: PayoutSettings) {
  const t = await getTranslations("ops.teaching");
  const values = {
    platformTakeLevel1: Math.round(Number(input.platformTakeLevel1)),
    platformTakeLevel2: Math.round(Number(input.platformTakeLevel2)),
    platformTakeLevel3: Math.round(Number(input.platformTakeLevel3)),
    platformTakeLevel4: Math.round(Number(input.platformTakeLevel4)),
    trialPercent: Math.round(Number(input.trialPercent)),
    trialReference25Cents: Math.round(Number(input.trialReference25Cents)),
    trialReference50Cents: Math.round(Number(input.trialReference50Cents)),
  };
  if (
    !validTake(values.platformTakeLevel1) ||
    !validTake(values.platformTakeLevel2) ||
    !validTake(values.platformTakeLevel3) ||
    !validTake(values.platformTakeLevel4) ||
    values.trialPercent < 0 ||
    values.trialPercent > 100 ||
    values.trialReference25Cents < 100 ||
    values.trialReference50Cents < 100 ||
    values.trialReference25Cents > 100_000 ||
    values.trialReference50Cents > 100_000
  ) {
    return {
      ok: false as const,
      message: t("invalidPayoutSettings"),
    };
  }
  await db
    .insert(payoutSettings)
    .values({
      id: "default",
      rate25Cents: 800,
      rate50Cents: 1_400,
      pairedPercent: 140,
      ...values,
      updatedByUserId: actor.userId,
    })
    .onConflictDoUpdate({
      target: payoutSettings.id,
      set: { ...values, updatedByUserId: actor.userId, updatedAt: new Date() },
    });
  await recordAuditEvent({
    action: "payout.settings_changed",
    severity: "warning",
    actorUserId: actor.userId,
    targetType: "settings",
    targetId: "payout",
    metadata: values,
  });
  return { ok: true as const, message: t("ratesSaved") };
}


/**
 * Records earnings for delivered classes that do not have one yet. Cheap and
 * idempotent (unique per class); called before any earnings screen loads.
 */
export async function accrueEarnings() {
  await requestTime(); // reads the clock
  const pending = await db
    .select({
      id: classSessions.id,
      teacherId: classSessions.teacherId,
      classType: classSessions.classType,
      billingKind: classSessions.billingKind,
      durationMinutes: classSessions.durationMinutes,
      creditValueCents: classSessions.creditValueCents,
      endsAt: classSessions.endsAt,
    })
    .from(classSessions)
    .leftJoin(teacherEarnings, eq(teacherEarnings.sessionId, classSessions.id))
    .where(
      and(
        eq(classSessions.status, "scheduled"),
        lt(classSessions.endsAt, new Date()),
        isNull(teacherEarnings.id),
      ),
    )
    .limit(1000);
  if (!pending.length) return 0;

  const [settings, stats] = await Promise.all([
    getPayoutSettings(),
    getTeacherStats([...new Set(pending.map((row) => row.teacherId))]),
  ]);

  const referenceCache = new Map<string, number>();
  const referenceFor = async (classType: string, durationMinutes: number) => {
    const key = `${classType}-${durationMinutes}`;
    if (!referenceCache.has(key)) {
      referenceCache.set(
        key,
        await referenceCreditValueCents({
          classType: classType as "one-on-one" | "paired",
          durationMinutes: durationMinutes as 25 | 50,
        }),
      );
    }
    return referenceCache.get(key)!;
  };

  const values = [];
  for (const row of pending) {
    const level = teacherLevelFor(stats.get(row.teacherId)!);
    let creditValueCents = row.creditValueCents ?? 0;
    if (creditValueCents <= 0) {
      creditValueCents =
        row.billingKind === "trial"
          ? trialReferenceCents(settings, row.durationMinutes)
          : await referenceFor(row.classType, row.durationMinutes);
    }
    const earning = classEarning(settings, {
      creditValueCents,
      level: level.level,
      billingKind: row.billingKind,
    });
    values.push({
      id: randomUUID(),
      sessionId: row.id,
      teacherId: row.teacherId,
      classType: row.classType,
      durationMinutes: row.durationMinutes,
      baseCents: earning.baseCents,
      levelPercent: earning.teacherSharePercent,
      level: level.level,
      amountCents: earning.amountCents,
      classEndedAt: row.endsAt,
    });
  }
  await db.insert(teacherEarnings).values(values).onConflictDoNothing();
  return values.length;
}

export type EarningEntry = {
  id: string;
  sessionId: string;
  topic: string;
  classType: string;
  durationMinutes: number;
  amountCents: number;
  level: number;
  classEndedAt: string;
  status: "unpaid" | "in-batch" | "paid";
};

export async function listEarningsForTeacher(teacherId: string, limit = 200): Promise<EarningEntry[]> {
  await accrueEarnings();
  const rows = await db
    .select({
      earning: teacherEarnings,
      topic: classSessions.topic,
      batchStatus: payoutBatches.status,
    })
    .from(teacherEarnings)
    .innerJoin(classSessions, eq(classSessions.id, teacherEarnings.sessionId))
    .leftJoin(payoutBatches, eq(payoutBatches.id, teacherEarnings.payoutBatchId))
    .where(eq(teacherEarnings.teacherId, teacherId))
    .orderBy(desc(teacherEarnings.classEndedAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.earning.id,
    sessionId: row.earning.sessionId,
    topic: row.topic,
    classType: row.earning.classType,
    durationMinutes: row.earning.durationMinutes,
    amountCents: row.earning.amountCents,
    level: row.earning.level,
    classEndedAt: row.earning.classEndedAt.toISOString(),
    status: row.batchStatus === "paid" ? "paid" : row.earning.payoutBatchId ? "in-batch" : "unpaid",
  }));
}

/* Payout batches */

export type BatchTeacherLine = { teacherId: string; teacherName: string; classes: number; amountCents: number };

export type PayoutBatchView = {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: PayoutBatchStatus;
  initiatedBy: PayoutBatchInitiator;
  totalCents: number;
  teacherCount: number;
  classCount: number;
  createdByName: string | null;
  approvedByName: string | null;
  paidReference: string | null;
  rejectedReason: string | null;
  createdAt: string;
  approvedAt: string | null;
  paidAt: string | null;
  lines: BatchTeacherLine[];
};

/** Unpaid (not in any open batch) earnings per teacher, up to a date. */
export async function unpaidEarningsByTeacher(until: Date) {
  await accrueEarnings();
  const rows = await db
    .select({
      teacherId: teacherEarnings.teacherId,
      teacherName: users.name,
      classes: sql<number>`count(*)::int`,
      amountCents: sql<number>`sum(${teacherEarnings.amountCents})::int`,
    })
    .from(teacherEarnings)
    .innerJoin(users, eq(users.id, teacherEarnings.teacherId))
    .where(and(isNull(teacherEarnings.payoutBatchId), lt(teacherEarnings.classEndedAt, until)))
    .groupBy(teacherEarnings.teacherId, users.name)
    .orderBy(users.name);
  return rows.map((row) => ({ ...row, classes: Number(row.classes), amountCents: Number(row.amountCents) }));
}

export type TeacherPayoutRequestSummary = {
  unpaidCents: number;
  unpaidClasses: number;
  stripeReady: boolean;
  minRequestCents: number;
  /** Open request this teacher cannot replace until it is paid or rejected. */
  pendingBatch: {
    id: string;
    status: "awaiting_approval" | "approved";
    amountCents: number;
    createdAt: string;
  } | null;
};

/** What a teacher needs to know before requesting a payout. */
export async function getTeacherPayoutRequestSummary(teacherId: string): Promise<TeacherPayoutRequestSummary> {
  await accrueEarnings();
  const [unpaidRow, profile, openBatch] = await Promise.all([
    db
      .select({
        cents: sql<number>`coalesce(sum(${teacherEarnings.amountCents}),0)::int`,
        classes: sql<number>`count(*)::int`,
      })
      .from(teacherEarnings)
      .where(and(eq(teacherEarnings.teacherId, teacherId), isNull(teacherEarnings.payoutBatchId))),
    db.select({ stripeReady: teacherProfiles.stripeReady }).from(teacherProfiles).where(eq(teacherProfiles.userId, teacherId)),
    db
      .select({
        id: payoutBatches.id,
        status: payoutBatches.status,
        totalCents: payoutBatches.totalCents,
        createdAt: payoutBatches.createdAt,
      })
      .from(payoutBatches)
      .innerJoin(teacherEarnings, eq(teacherEarnings.payoutBatchId, payoutBatches.id))
      .where(
        and(
          eq(teacherEarnings.teacherId, teacherId),
          eq(payoutBatches.initiatedBy, "teacher"),
          inArray(payoutBatches.status, ["awaiting_approval", "approved"]),
        ),
      )
      .orderBy(desc(payoutBatches.createdAt))
      .limit(1),
  ]);
  const pending = openBatch[0];
  return {
    unpaidCents: Number(unpaidRow[0]?.cents ?? 0),
    unpaidClasses: Number(unpaidRow[0]?.classes ?? 0),
    stripeReady: profile[0]?.stripeReady ?? false,
    minRequestCents: MIN_TEACHER_PAYOUT_REQUEST_CENTS,
    pendingBatch:
      pending && (pending.status === "awaiting_approval" || pending.status === "approved")
        ? {
            id: pending.id,
            status: pending.status,
            amountCents: pending.totalCents,
            createdAt: pending.createdAt.toISOString(),
          }
        : null,
  };
}

/** Teacher claims all current unpaid earnings into a single-teacher batch for approval. */
export async function requestTeacherPayout(actor: AuthSession) {
  const t = await getTranslations("ops.teaching");
  if (!actor.roles.includes("teacher")) {
    return { ok: false as const, message: t("onlyTeachersRequest") };
  }
  const { getPaymentProviderSettings, manualPayoutAllowed, payoutUsesStripeConnect } = await import(
    "@/server/payments/provider-settings"
  );
  const providerSettings = await getPaymentProviderSettings();
  const stripePayout = payoutUsesStripeConnect(providerSettings);
  const manualPayout = manualPayoutAllowed(providerSettings);
  if (!stripePayout && !manualPayout) {
    return { ok: false as const, message: t("payoutsPaused") };
  }
  const teacherId = actor.userId;
  const summary = await getTeacherPayoutRequestSummary(teacherId);
  if (stripePayout && !manualPayout && !summary.stripeReady) {
    return { ok: false as const, message: t("connectStripeFirst") };
  }
  if (summary.pendingBatch) {
    return { ok: false as const, message: t("pendingRequest") };
  }
  if (summary.unpaidCents < MIN_TEACHER_PAYOUT_REQUEST_CENTS) {
    return {
      ok: false as const,
      message: t("minRequest", { amount: formatCents(MIN_TEACHER_PAYOUT_REQUEST_CENTS) }),
    };
  }
  if (!summary.unpaidClasses) {
    return { ok: false as const, message: t("noUnpaidClasses") };
  }

  await accrueEarnings();
  const batchId = randomUUID();
  const periodEnd = new Date();
  const result = await db.execute(sql`
    WITH claimed AS (
      UPDATE teacher_earnings SET payout_batch_id = ${batchId}
      WHERE payout_batch_id IS NULL AND teacher_id = ${teacherId}
      RETURNING amount_cents, class_ended_at
    ), bounds AS (
      SELECT
        coalesce(min(class_ended_at), ${periodEnd.toISOString()}::timestamptz) AS period_start,
        coalesce(max(class_ended_at), ${periodEnd.toISOString()}::timestamptz) AS period_end,
        coalesce(sum(amount_cents), 0)::int AS total_cents,
        count(*)::int AS class_count
      FROM claimed
    )
    INSERT INTO payout_batches (
      id, period_start, period_end, status, initiated_by, total_cents, teacher_count, class_count, created_by_user_id
    )
    SELECT
      ${batchId},
      period_start,
      period_end + interval '1 second',
      'awaiting_approval',
      'teacher',
      total_cents,
      1,
      class_count,
      ${teacherId}
    FROM bounds
    WHERE class_count > 0 AND total_cents >= ${MIN_TEACHER_PAYOUT_REQUEST_CENTS}
    RETURNING total_cents AS "totalCents", class_count AS "classCount"
  `);
  const batch = rowsOf<{ totalCents: number; classCount: number }>(result)[0];
  if (!batch) {
    await db.update(teacherEarnings).set({ payoutBatchId: null }).where(eq(teacherEarnings.payoutBatchId, batchId));
    return { ok: false as const, message: t("requestFailed") };
  }

  const [teacher] = await db.select({ name: users.name }).from(users).where(eq(users.id, teacherId)).limit(1);
  const amount = formatCents(Number(batch.totalCents));
  await recordAuditEvent({
    action: "payout.requested",
    actorUserId: teacherId,
    targetType: "payout",
    targetId: batchId,
    metadata: { totalCents: batch.totalCents, classes: batch.classCount, teacherId },
  });
  const processingDays = payoutProcessingWindowPhrase(undefined, {
    one: t("processingDaysOne"),
    other: t("processingDaysOther"),
  });
  notifyRole("payout-requested", "manager", { name: teacher?.name, amount, processingDays });
  notifyRole("payout-requested", "admin", { name: teacher?.name, amount, processingDays });
  notifyUsers("payout-request-submitted", [teacherId], { amount, processingDays });
  return {
    ok: true as const,
    message: t("payoutRequested", { amount, count: batch.classCount, days: processingDays }),
  };
}

/** Demo seed: creates a teacher-initiated batch without auth (development / seed only). */
export async function seedTeacherPayoutRequest(teacherId: string) {
  await accrueEarnings();
  const summary = await getTeacherPayoutRequestSummary(teacherId);
  if (summary.pendingBatch || summary.unpaidCents < MIN_TEACHER_PAYOUT_REQUEST_CENTS) return false;

  const batchId = randomUUID();
  const periodEnd = new Date();
  const result = await db.execute(sql`
    WITH claimed AS (
      UPDATE teacher_earnings SET payout_batch_id = ${batchId}
      WHERE payout_batch_id IS NULL AND teacher_id = ${teacherId}
      RETURNING amount_cents, class_ended_at
    ), bounds AS (
      SELECT
        coalesce(min(class_ended_at), ${periodEnd.toISOString()}::timestamptz) AS period_start,
        coalesce(max(class_ended_at), ${periodEnd.toISOString()}::timestamptz) AS period_end,
        coalesce(sum(amount_cents), 0)::int AS total_cents,
        count(*)::int AS class_count
      FROM claimed
    )
    INSERT INTO payout_batches (
      id, period_start, period_end, status, initiated_by, total_cents, teacher_count, class_count, created_by_user_id
    )
    SELECT
      ${batchId},
      period_start,
      period_end + interval '1 second',
      'awaiting_approval',
      'teacher',
      total_cents,
      1,
      class_count,
      ${teacherId}
    FROM bounds
    WHERE class_count > 0 AND total_cents >= ${MIN_TEACHER_PAYOUT_REQUEST_CENTS}
    RETURNING id
  `);
  return rowsOf<{ id: string }>(result).length > 0;
}

export async function createPayoutBatch(actor: AuthSession, input: { periodStart: string; periodEnd: string }) {
  const t = await getTranslations("ops.teaching");
  const start = new Date(input.periodStart);
  const end = new Date(input.periodEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return { ok: false as const, message: t("invalidPeriod") };
  }
  if (end.getTime() > Date.now()) {
    return { ok: false as const, message: t("periodMustEnd") };
  }
  await accrueEarnings();

  const batchId = randomUUID();
  // Claim the unpaid earnings of the period and create the batch together.
  const result = await db.execute(sql`
    WITH claimed AS (
      UPDATE teacher_earnings SET payout_batch_id = ${batchId}
      WHERE payout_batch_id IS NULL
        AND class_ended_at >= ${start.toISOString()}::timestamptz
        AND class_ended_at < ${end.toISOString()}::timestamptz
      RETURNING teacher_id, amount_cents
    ), batch AS (
      INSERT INTO payout_batches (id, period_start, period_end, status, initiated_by, total_cents, teacher_count, class_count, created_by_user_id)
      SELECT ${batchId}, ${start.toISOString()}::timestamptz, ${end.toISOString()}::timestamptz, 'awaiting_approval', 'manager',
             coalesce(sum(amount_cents), 0)::int, count(DISTINCT teacher_id)::int, count(*)::int, ${actor.userId}
      FROM claimed
      HAVING count(*) > 0
      RETURNING total_cents, class_count
    )
    SELECT total_cents AS "totalCents", class_count AS "classCount" FROM batch
  `);
  const batch = rowsOf<{ totalCents: number; classCount: number }>(result)[0];
  if (!batch) return { ok: false as const, message: t("noUnpaidInPeriod") };

  await recordAuditEvent({
    action: "payout.created",
    actorUserId: actor.userId,
    targetType: "payout",
    targetId: batchId,
    metadata: { totalCents: batch.totalCents, classes: batch.classCount },
  });
  notifyRole("payout-ready", "admin", {
    amount: formatCents(Number(batch.totalCents)),
    period: formatPeriod(start, end),
  });
  return { ok: true as const, message: t("payoutSentToAdmin", { amount: formatCents(Number(batch.totalCents)) }) };
}

export async function listPayoutBatches(limit = 30): Promise<PayoutBatchView[]> {
  const batches = await db.select().from(payoutBatches).orderBy(desc(payoutBatches.createdAt)).limit(limit);
  if (!batches.length) return [];

  const peopleIds = [
    ...new Set(batches.flatMap((batch) => [batch.createdByUserId, batch.approvedByUserId]).filter(Boolean)),
  ] as string[];
  const [people, lines] = await Promise.all([
    peopleIds.length
      ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, peopleIds))
      : Promise.resolve([]),
    db
      .select({
        batchId: teacherEarnings.payoutBatchId,
        teacherId: teacherEarnings.teacherId,
        teacherName: users.name,
        classes: sql<number>`count(*)::int`,
        amountCents: sql<number>`sum(${teacherEarnings.amountCents})::int`,
      })
      .from(teacherEarnings)
      .innerJoin(users, eq(users.id, teacherEarnings.teacherId))
      .where(inArray(teacherEarnings.payoutBatchId, batches.map((batch) => batch.id)))
      .groupBy(teacherEarnings.payoutBatchId, teacherEarnings.teacherId, users.name),
  ]);
  const nameById = new Map(people.map((person) => [person.id, person.name]));

  return batches.map((batch) => ({
    id: batch.id,
    periodStart: batch.periodStart.toISOString(),
    periodEnd: batch.periodEnd.toISOString(),
    status: batch.status,
    initiatedBy: batch.initiatedBy,
    totalCents: batch.totalCents,
    teacherCount: batch.teacherCount,
    classCount: batch.classCount,
    createdByName: batch.createdByUserId ? (nameById.get(batch.createdByUserId) ?? null) : null,
    approvedByName: batch.approvedByUserId ? (nameById.get(batch.approvedByUserId) ?? null) : null,
    paidReference: batch.paidReference,
    rejectedReason: batch.rejectedReason,
    createdAt: batch.createdAt.toISOString(),
    approvedAt: batch.approvedAt?.toISOString() ?? null,
    paidAt: batch.paidAt?.toISOString() ?? null,
    lines: lines
      .filter((line) => line.batchId === batch.id)
      .map((line) => ({
        teacherId: line.teacherId,
        teacherName: line.teacherName,
        classes: Number(line.classes),
        amountCents: Number(line.amountCents),
      })),
  }));
}

async function moveBatch(
  id: string,
  from: PayoutBatchStatus,
  set: Partial<typeof payoutBatches.$inferInsert>,
) {
  const rows = await db
    .update(payoutBatches)
    .set(set)
    .where(and(eq(payoutBatches.id, id), eq(payoutBatches.status, from)))
    .returning();
  return rows[0] ?? null;
}

export async function approvePayoutBatch(actor: AuthSession, id: string) {
  const t = await getTranslations("ops.teaching");
  const batch = await moveBatch(id, "awaiting_approval", {
    status: "approved",
    approvedByUserId: actor.userId,
    approvedAt: new Date(),
  });
  if (!batch) return { ok: false as const, message: t("onlyAwaitingApproval") };
  await recordAuditEvent({
    action: "payout.approved",
    severity: "warning",
    actorUserId: actor.userId,
    targetType: "payout",
    targetId: id,
    metadata: { totalCents: batch.totalCents },
  });

  const processingDays = payoutProcessingWindowPhrase(undefined, {
    one: t("processingDaysOne"),
    other: t("processingDaysOther"),
  });
  const period = formatPeriod(batch.periodStart, batch.periodEnd);
  const lines = await db
    .select({
      teacherId: teacherEarnings.teacherId,
      amountCents: sql<number>`sum(${teacherEarnings.amountCents})::int`,
    })
    .from(teacherEarnings)
    .where(eq(teacherEarnings.payoutBatchId, id))
    .groupBy(teacherEarnings.teacherId);
  for (const line of lines) {
    notifyUsers("payout-approved", [line.teacherId], {
      amount: formatCents(Number(line.amountCents)),
      period,
      processingDays,
    });
  }

  const days = payoutProcessingBusinessDays();
  return {
    ok: true as const,
    message: t("approvedMessage", { days }),
  };
}

export async function rejectPayoutBatch(actor: AuthSession, id: string, reason: string) {
  const t = await getTranslations("ops.teaching");
  const batch = await moveBatch(id, "awaiting_approval", {
    status: "rejected",
    approvedByUserId: actor.userId,
    approvedAt: new Date(),
    rejectedReason: reason.trim().slice(0, 500) || t("rejectedDefault"),
  });
  if (!batch) return { ok: false as const, message: t("onlyAwaitingRejection") };
  // The classes go back to "unpaid" so a new batch can include them.
  await db.update(teacherEarnings).set({ payoutBatchId: null }).where(eq(teacherEarnings.payoutBatchId, id));
  await recordAuditEvent({
    action: "payout.rejected",
    actorUserId: actor.userId,
    targetType: "payout",
    targetId: id,
    metadata: { reason },
  });
  return { ok: true as const, message: t("rejectedMessage") };
}

export async function markPayoutBatchPaid(actor: AuthSession, id: string, reference: string) {
  const t = await getTranslations("ops.teaching");
  const { getPaymentProviderSettings, manualPayoutAllowed } = await import("@/server/payments/provider-settings");
  const settings = await getPaymentProviderSettings();
  if (!manualPayoutAllowed(settings)) {
    return { ok: false as const, message: t("manualDisabled") };
  }
  const ref = reference.trim().slice(0, 200);
  if (ref.length < 3) return { ok: false as const, message: t("addReference") };
  const batch = await moveBatch(id, "approved", { status: "paid", paidAt: new Date(), paidReference: ref });
  if (!batch) return { ok: false as const, message: t("onlyApprovedMarkPaid") };

  await recordAuditEvent({
    action: "payout.paid",
    severity: "warning",
    actorUserId: actor.userId,
    targetType: "payout",
    targetId: id,
    metadata: { totalCents: batch.totalCents, reference: ref },
  });

  const lines = await db
    .select({
      teacherId: teacherEarnings.teacherId,
      amountCents: sql<number>`sum(${teacherEarnings.amountCents})::int`,
    })
    .from(teacherEarnings)
    .where(eq(teacherEarnings.payoutBatchId, id))
    .groupBy(teacherEarnings.teacherId);
  const processingDays = payoutProcessingWindowPhrase(undefined, {
    one: t("processingDaysOne"),
    other: t("processingDaysOther"),
  });
  const period = formatPeriod(batch.periodStart, batch.periodEnd);
  for (const line of lines) {
    notifyUsers("payout-paid", [line.teacherId], {
      amount: formatCents(Number(line.amountCents)),
      period,
      processingDays,
    });
  }
  return {
    ok: true as const,
    message: t("markedPaid", { days: processingDays }),
  };
}

/* Finance summary for the admin ledger */

export async function getFinanceSummary() {
  await requestTime(); // reads the clock
  await accrueEarnings();
  const [orderTotals, creditTotals, earningTotals, thisMonth] = await Promise.all([
    db.execute(sql`SELECT coalesce(sum(total_cents),0)::bigint AS revenue, coalesce(sum(credits),0)::bigint AS credits, count(*)::int AS orders FROM orders WHERE status = 'paid'`),
    db.execute(sql`SELECT coalesce(sum(balance),0)::bigint AS outstanding FROM credit_accounts`),
    db.execute(sql`
      SELECT coalesce(sum(e.amount_cents),0)::bigint AS accrued,
             coalesce(sum(e.amount_cents) FILTER (WHERE b.status = 'paid'),0)::bigint AS paid,
             coalesce(sum(e.amount_cents) FILTER (WHERE e.payout_batch_id IS NULL),0)::bigint AS unbatched,
             count(*)::int AS classes
      FROM teacher_earnings e LEFT JOIN payout_batches b ON b.id = e.payout_batch_id`),
    db
      .select({ amount: sql<number>`coalesce(sum(${teacherEarnings.amountCents}),0)::int` })
      .from(teacherEarnings)
      .where(gte(teacherEarnings.classEndedAt, startOfMonth())),
  ]);
  const orders = rowsOf<{ revenue: string; credits: string; orders: number }>(orderTotals)[0];
  const credits = rowsOf<{ outstanding: string }>(creditTotals)[0];
  const earnings = rowsOf<{ accrued: string; paid: string; unbatched: string; classes: number }>(earningTotals)[0];

  const revenueCents = Number(orders?.revenue ?? 0);
  const creditsSold = Number(orders?.credits ?? 0);
  const pricePerCredit = creditsSold ? revenueCents / creditsSold : 0;
  return {
    revenueCents,
    orders: Number(orders?.orders ?? 0),
    creditsSold,
    creditsOutstanding: Number(credits?.outstanding ?? 0),
    /** Prepaid classes not taught yet, valued at the average price per credit. */
    deferredRevenueCents: Math.round(Number(credits?.outstanding ?? 0) * pricePerCredit),
    teacherEarnedCents: Number(earnings?.accrued ?? 0),
    teacherPaidCents: Number(earnings?.paid ?? 0),
    teacherUnbatchedCents: Number(earnings?.unbatched ?? 0),
    deliveredClasses: Number(earnings?.classes ?? 0),
    teacherEarnedThisMonthCents: Number(thisMonth[0]?.amount ?? 0),
  };
}

/* Formatting helpers */

export function formatCents(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

export function formatPeriod(start: Date, end: Date) {
  const format = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  return `${format.format(start)} – ${format.format(new Date(end.getTime() - 1))}`;
}

export function startOfMonth(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}
