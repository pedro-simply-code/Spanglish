import { and, asc, desc, eq, isNull, lt } from "drizzle-orm";
import { cancelAiStripeOrder, fulfillAiStripeOrder } from "@/server/ai/credits";
import { db } from "@/server/db";
import { aiCreditOrders, orders, users } from "@/server/db/schema";
import { cancelStripeOrder, fulfillStripeOrder } from "@/server/payments/checkout";
import { stripe, stripeEnabled } from "@/server/payments/stripe";

/*
 * Pending payments that never got their webhook. Stripe is asked about each
 * one: paid → fulfilled (credits added once), expired → canceled, still open →
 * left alone (the student can finish it). Runs from:
 *   - GET /api/cron/reconcile-payments (every hour, with CRON_SECRET),
 *   - My credits (the student's own pending orders),
 *   - admin → payment providers ("Check with Stripe").
 * Class orders and AI credit orders live in different tables; `kind` says which.
 */

export type PaymentKind = "classes" | "ai";

export type ReconcileOutcome = "paid" | "canceled" | "open" | "processing" | "not-found" | "mismatch" | "error";

export type ReconcileResult = { outcome: ReconcileOutcome; credits?: number; url?: string | null };

type PendingRow = { id: string; providerRef: string | null; buyerUserId: string };

const fulfillers = { classes: fulfillStripeOrder, ai: fulfillAiStripeOrder } as const;
const cancelers = { classes: cancelStripeOrder, ai: cancelAiStripeOrder } as const;

async function cancelWithoutSession(kind: PaymentKind, id: string) {
  // The Stripe page never opened (no session id): nothing can be paid.
  if (kind === "classes") {
    await db
      .update(orders)
      .set({ status: "canceled" })
      .where(and(eq(orders.id, id), eq(orders.status, "pending"), isNull(orders.providerRef)));
  } else {
    await db
      .update(aiCreditOrders)
      .set({ status: "canceled" })
      .where(and(eq(aiCreditOrders.id, id), eq(aiCreditOrders.status, "pending"), isNull(aiCreditOrders.providerRef)));
  }
}

/** Asks Stripe about one pending order and settles it. */
export async function reconcileStripeOrder(kind: PaymentKind, order: PendingRow): Promise<ReconcileResult> {
  if (!stripeEnabled) return { outcome: "error" };
  if (!order.providerRef) {
    await cancelWithoutSession(kind, order.id);
    return { outcome: "canceled" };
  }
  try {
    const session = await stripe().checkout.sessions.retrieve(order.providerRef);
    if (session.client_reference_id !== order.id) return { outcome: "not-found" };

    if (session.payment_status === "paid") {
      const result = await fulfillers[kind]({
        sessionId: session.id,
        orderId: order.id,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
      });
      if (result.status === "paid" || result.status === "already-paid") return { outcome: "paid", credits: result.credits };
      if (result.status === "mismatch") return { outcome: "mismatch" };
      return { outcome: "not-found" };
    }
    if (session.status === "expired") {
      await cancelers[kind](session.id, order.id);
      return { outcome: "canceled" };
    }
    if (session.status === "open") return { outcome: "open", url: session.url };
    // Completed but not paid yet (bank payments take a few days).
    return { outcome: "processing" };
  } catch (error) {
    console.error("[payments:reconcile]", kind, order.id, error);
    return { outcome: "error" };
  }
}

async function pendingRows(kind: PaymentKind, filter: { olderThan?: Date; userId?: string; limit: number }) {
  if (kind === "classes") {
    return db
      .select({ id: orders.id, providerRef: orders.providerRef, buyerUserId: orders.buyerUserId })
      .from(orders)
      .where(
        and(
          eq(orders.provider, "stripe"),
          eq(orders.status, "pending"),
          filter.olderThan ? lt(orders.createdAt, filter.olderThan) : undefined,
          filter.userId ? eq(orders.buyerUserId, filter.userId) : undefined,
        ),
      )
      .orderBy(asc(orders.createdAt))
      .limit(filter.limit);
  }
  return db
    .select({ id: aiCreditOrders.id, providerRef: aiCreditOrders.providerRef, buyerUserId: aiCreditOrders.buyerUserId })
    .from(aiCreditOrders)
    .where(
      and(
        eq(aiCreditOrders.provider, "stripe"),
        eq(aiCreditOrders.status, "pending"),
        filter.olderThan ? lt(aiCreditOrders.createdAt, filter.olderThan) : undefined,
        filter.userId ? eq(aiCreditOrders.buyerUserId, filter.userId) : undefined,
      ),
    )
    .orderBy(asc(aiCreditOrders.createdAt))
    .limit(filter.limit);
}

export type ReconcileSummary = Record<ReconcileOutcome, number> & { checked: number };

/**
 * Settles pending Stripe orders of both kinds. `olderThanMinutes` skips the
 * ones a student may still be paying (a Checkout page lasts 60 minutes).
 */
export async function reconcilePendingPayments(options?: {
  olderThanMinutes?: number;
  userId?: string;
  limit?: number;
}): Promise<ReconcileSummary> {
  const summary: ReconcileSummary = {
    checked: 0,
    paid: 0,
    canceled: 0,
    open: 0,
    processing: 0,
    "not-found": 0,
    mismatch: 0,
    error: 0,
  };
  if (!stripeEnabled) return summary;
  const olderThan =
    options?.olderThanMinutes !== undefined ? new Date(Date.now() - options.olderThanMinutes * 60_000) : undefined;
  const limit = options?.limit ?? 50;
  for (const kind of ["classes", "ai"] as const) {
    const rows = await pendingRows(kind, { olderThan, userId: options?.userId, limit });
    for (const row of rows) {
      const result = await reconcileStripeOrder(kind, row);
      summary.checked += 1;
      summary[result.outcome] += 1;
    }
  }
  return summary;
}

/** One pending order, if it belongs to the student (for "Finish payment"). */
export async function findPendingOrder(kind: PaymentKind, id: string, userId?: string) {
  const [row] =
    kind === "classes"
      ? await db
          .select({ id: orders.id, providerRef: orders.providerRef, buyerUserId: orders.buyerUserId, provider: orders.provider })
          .from(orders)
          .where(and(eq(orders.id, id), eq(orders.status, "pending")))
          .limit(1)
      : await db
          .select({
            id: aiCreditOrders.id,
            providerRef: aiCreditOrders.providerRef,
            buyerUserId: aiCreditOrders.buyerUserId,
            provider: aiCreditOrders.provider,
          })
          .from(aiCreditOrders)
          .where(and(eq(aiCreditOrders.id, id), eq(aiCreditOrders.status, "pending")))
          .limit(1);
  if (!row || row.provider !== "stripe") return null;
  if (userId && row.buyerUserId !== userId) return null;
  return row;
}

export type PendingPayment = {
  kind: PaymentKind;
  id: string;
  buyerName: string;
  buyerEmail: string;
  credits: number;
  classType: string | null;
  durationMinutes: number | null;
  totalCents: number;
  currency: string;
  createdAt: string;
};

/** Every pending Stripe payment, newest first (admin). */
export async function listPendingPayments(limit = 100): Promise<PendingPayment[]> {
  const [classRows, aiRows] = await Promise.all([
    db
      .select({
        id: orders.id,
        buyerName: users.name,
        buyerEmail: users.email,
        credits: orders.credits,
        classType: orders.classType,
        durationMinutes: orders.durationMinutes,
        totalCents: orders.totalCents,
        currency: orders.currency,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.buyerUserId))
      .where(and(eq(orders.provider, "stripe"), eq(orders.status, "pending")))
      .orderBy(desc(orders.createdAt))
      .limit(limit),
    db
      .select({
        id: aiCreditOrders.id,
        buyerName: users.name,
        buyerEmail: users.email,
        credits: aiCreditOrders.credits,
        totalCents: aiCreditOrders.totalCents,
        currency: aiCreditOrders.currency,
        createdAt: aiCreditOrders.createdAt,
      })
      .from(aiCreditOrders)
      .innerJoin(users, eq(users.id, aiCreditOrders.buyerUserId))
      .where(and(eq(aiCreditOrders.provider, "stripe"), eq(aiCreditOrders.status, "pending")))
      .orderBy(desc(aiCreditOrders.createdAt))
      .limit(limit),
  ]);
  return [
    ...classRows.map((row) => ({ ...row, kind: "classes" as const, createdAt: row.createdAt.toISOString() })),
    ...aiRows.map((row) => ({
      ...row,
      kind: "ai" as const,
      classType: null,
      durationMinutes: null,
      createdAt: row.createdAt.toISOString(),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
