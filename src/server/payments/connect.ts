import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import {
  payoutBatches,
  payoutTransfers,
  teacherEarnings,
  teacherProfiles,
  users,
} from "@/server/db/schema";
import {
  STRIPE_CURRENCY,
  stripe,
  stripeErrorMessage,
} from "@/server/payments/stripe";
import { markPayoutBatchPaid } from "@/server/teaching/earnings";

/*
 * Sending money: each teacher connects a Stripe Express account once
 * (Stripe collects their identity and bank details; the academy never sees
 * them). The admin then pays an approved payout batch with one transfer per
 * teacher from the academy's Stripe balance.
 */

type StripeAccountLike = {
  id: string;
  capabilities?: { transfers?: string | null } | null;
  payouts_enabled?: boolean | null;
};

const isReady = (account: StripeAccountLike) =>
  account.capabilities?.transfers === "active";

async function profileOf(userId: string) {
  const [row] = await db
    .select({
      accountId: teacherProfiles.stripeAccountId,
      ready: teacherProfiles.stripeReady,
    })
    .from(teacherProfiles)
    .where(eq(teacherProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

export type TeacherStripeStatus = { connected: boolean; ready: boolean };

/** Reads the teacher's status, refreshing it from Stripe while onboarding is unfinished. */
export async function getTeacherStripeStatus(
  userId: string,
): Promise<TeacherStripeStatus> {
  const profile = await profileOf(userId);
  if (!profile?.accountId) return { connected: false, ready: false };
  if (profile.ready) return { connected: true, ready: true };
  try {
    const account = await stripe().accounts.retrieve(profile.accountId);
    await syncConnectedAccount(account);
    return { connected: true, ready: isReady(account) };
  } catch {
    return { connected: true, ready: false };
  }
}

/** Creates the Express account if needed and returns the Stripe onboarding link. */
export async function createOnboardingLink(
  actor: AuthSession,
): Promise<string> {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  let profile = await profileOf(actor.userId);
  if (!profile) {
    await db
      .insert(teacherProfiles)
      .values({ userId: actor.userId })
      .onConflictDoNothing();
    profile = { accountId: null, ready: false };
  }

  let accountId = profile.accountId;
  if (!accountId) {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, actor.userId))
      .limit(1);
    const account = await stripe().accounts.create(
      {
        type: "express",
        country: env.STRIPE_CONNECT_COUNTRY,
        email: user?.email,
        business_type: "individual",
        capabilities: { transfers: { requested: true } },
        metadata: { userId: actor.userId },
      },
      { idempotencyKey: `connect-${actor.userId}` },
    );
    accountId = account.id;
    await db
      .update(teacherProfiles)
      .set({ stripeAccountId: accountId, stripeReady: false })
      .where(eq(teacherProfiles.userId, actor.userId));
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base}/teacher/earnings?stripe=refresh`,
    return_url: `${base}/teacher/earnings?stripe=return`,
  });
  return link.url;
}

/** Stripe Express dashboard (payout schedule, bank account, history). */
export async function createDashboardLink(
  actor: AuthSession,
): Promise<string | null> {
  const profile = await profileOf(actor.userId);
  if (!profile?.accountId || !profile.ready) return null;
  const link = await stripe().accounts.createLoginLink(profile.accountId);
  return link.url;
}

/** Stores readiness for a connected account (webhook `account.updated` or a refresh). */
export async function syncConnectedAccount(account: StripeAccountLike) {
  const ready = isReady(account);
  const [row] = await db
    .update(teacherProfiles)
    .set({ stripeReady: ready })
    .where(
      and(
        eq(teacherProfiles.stripeAccountId, account.id),
        sql`${teacherProfiles.stripeReady} IS DISTINCT FROM ${ready}`,
      ),
    )
    .returning({ userId: teacherProfiles.userId });
  if (row && ready) {
    await recordAuditEvent({
      action: "teacher.stripe_connected",
      actorUserId: row.userId,
      targetType: "user",
      targetId: row.userId,
      metadata: { account: account.id },
    });
  }
}

export type StripePayoutLine = {
  teacherId: string;
  teacherName: string;
  amountCents: number;
  ready: boolean;
  transfer: { status: "paid" | "failed"; error: string | null } | null;
};

/** Per-teacher lines of a batch with their Stripe readiness and transfer state. */
export async function stripeLinesForBatch(
  batchId: string,
): Promise<StripePayoutLine[]> {
  const lines = await db
    .select({
      teacherId: teacherEarnings.teacherId,
      teacherName: users.name,
      amountCents: sql<number>`sum(${teacherEarnings.amountCents})::int`,
      accountId: teacherProfiles.stripeAccountId,
      ready: teacherProfiles.stripeReady,
    })
    .from(teacherEarnings)
    .innerJoin(users, eq(users.id, teacherEarnings.teacherId))
    .leftJoin(
      teacherProfiles,
      eq(teacherProfiles.userId, teacherEarnings.teacherId),
    )
    .where(eq(teacherEarnings.payoutBatchId, batchId))
    .groupBy(
      teacherEarnings.teacherId,
      users.name,
      teacherProfiles.stripeAccountId,
      teacherProfiles.stripeReady,
    );
  const transfers = await db
    .select()
    .from(payoutTransfers)
    .where(eq(payoutTransfers.batchId, batchId));
  return lines.map((line) => {
    const transfer = transfers.find((row) => row.teacherId === line.teacherId);
    return {
      teacherId: line.teacherId,
      teacherName: line.teacherName,
      amountCents: Number(line.amountCents),
      ready: Boolean(line.accountId && line.ready),
      transfer: transfer
        ? { status: transfer.status, error: transfer.error }
        : null,
    };
  });
}

/**
 * Pays an approved batch: one transfer per teacher (idempotent per batch and
 * teacher, so a retry never pays twice). Marks the batch paid when every
 * teacher is paid; otherwise it stays approved and can be retried.
 */
export async function payBatchWithStripe(actor: AuthSession, batchId: string) {
  const t = await getTranslations("ops.payments");
  const [batch] = await db
    .select()
    .from(payoutBatches)
    .where(eq(payoutBatches.id, batchId))
    .limit(1);
  if (!batch || batch.status !== "approved") {
    return {
      ok: false as const,
      message: t("onlyApprovedBatches"),
    };
  }

  const lines = await db
    .select({
      teacherId: teacherEarnings.teacherId,
      teacherName: users.name,
      amountCents: sql<number>`sum(${teacherEarnings.amountCents})::int`,
      accountId: teacherProfiles.stripeAccountId,
      ready: teacherProfiles.stripeReady,
    })
    .from(teacherEarnings)
    .innerJoin(users, eq(users.id, teacherEarnings.teacherId))
    .leftJoin(
      teacherProfiles,
      eq(teacherProfiles.userId, teacherEarnings.teacherId),
    )
    .where(eq(teacherEarnings.payoutBatchId, batchId))
    .groupBy(
      teacherEarnings.teacherId,
      users.name,
      teacherProfiles.stripeAccountId,
      teacherProfiles.stripeReady,
    );

  const missing = lines
    .filter((line) => !line.accountId || !line.ready)
    .map((line) => line.teacherName);
  if (missing.length) {
    return {
      ok: false as const,
      message: t("teachersNotConnected", { names: missing.join(", ") }),
    };
  }

  const done = await db
    .select()
    .from(payoutTransfers)
    .where(eq(payoutTransfers.batchId, batchId));
  const failures: string[] = [];
  let sentCents = 0;

  for (const line of lines) {
    const previous = done.find((row) => row.teacherId === line.teacherId);
    if (previous?.status === "paid") continue;
    const amount = Number(line.amountCents);
    try {
      const transfer = await stripe().transfers.create(
        {
          amount,
          currency: STRIPE_CURRENCY,
          destination: line.accountId!,
          transfer_group: `payout_${batchId}`,
          description: `Spanglish teacher payout ${batch.periodStart.toISOString().slice(0, 7)}`,
          metadata: { batchId, teacherId: line.teacherId },
        },
        { idempotencyKey: `payout-${batchId}-${line.teacherId}` },
      );
      await db
        .insert(payoutTransfers)
        .values({
          id: randomUUID(),
          batchId,
          teacherId: line.teacherId,
          amountCents: amount,
          stripeAccountId: line.accountId!,
          stripeTransferId: transfer.id,
          status: "paid",
        })
        .onConflictDoUpdate({
          target: [payoutTransfers.batchId, payoutTransfers.teacherId],
          set: { status: "paid", stripeTransferId: transfer.id, error: null },
        });
      sentCents += amount;
    } catch (error) {
      const message = stripeErrorMessage(error, t("unknownStripeError"));
      failures.push(`${line.teacherName}: ${message}`);
      await db
        .insert(payoutTransfers)
        .values({
          id: randomUUID(),
          batchId,
          teacherId: line.teacherId,
          amountCents: amount,
          stripeAccountId: line.accountId!,
          status: "failed",
          error: message.slice(0, 500),
        })
        .onConflictDoUpdate({
          target: [payoutTransfers.batchId, payoutTransfers.teacherId],
          set: { status: "failed", error: message.slice(0, 500) },
        });
      await recordAuditEvent({
        action: "payout.stripe_failed",
        severity: "warning",
        actorUserId: actor.userId,
        targetType: "payout",
        targetId: batchId,
        metadata: {
          teacherId: line.teacherId,
          amountCents: amount,
          error: message,
        },
      });
    }
  }

  if (failures.length) {
    return {
      ok: false as const,
      message: t("transfersFailed", { failures: failures.join(" · ") }),
    };
  }

  await recordAuditEvent({
    action: "payout.stripe_sent",
    severity: "warning",
    actorUserId: actor.userId,
    targetType: "payout",
    targetId: batchId,
    metadata: { sentCents, teachers: lines.length },
  });
  const paid = await markPayoutBatchPaid(
    actor,
    batchId,
    `Stripe transfer group payout_${batchId}`,
  );
  return paid.ok
    ? {
        ok: true as const,
        message: t("sentWithStripe"),
      }
    : paid;
}
