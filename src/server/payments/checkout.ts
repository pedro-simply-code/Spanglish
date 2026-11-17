import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { env } from "@/env";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { rowsOf } from "@/server/credits/credits";
import { db } from "@/server/db";
import { orders, users } from "@/server/db/schema";
import { STRIPE_CURRENCY, stripe } from "@/server/payments/stripe";

/*
 * Receiving money: a package purchase becomes a `pending` order and a Stripe
 * Checkout Session. Credits are added only when Stripe confirms the payment
 * (webhook `checkout.session.completed`, or the return page as a fallback);
 * both paths call `fulfillStripeOrder`, which runs once per order.
 */

type PackageForSale = {
  id: string;
  name: string;
  classType: "one-on-one" | "paired";
  durationMinutes: number;
  credits: number;
  totalCents: number;
};

export async function startStripeCheckout(
  actor: AuthSession,
  pkg: PackageForSale,
  pairId: string | null,
): Promise<{ orderId: string; url: string }> {
  const orderId = randomUUID();
  await db.insert(orders).values({
    id: orderId,
    buyerUserId: actor.userId,
    pairId,
    packageId: pkg.id,
    classType: pkg.classType,
    durationMinutes: pkg.durationMinutes,
    credits: pkg.credits,
    totalCents: pkg.totalCents,
    currency: "USD",
    provider: "stripe",
    status: "pending",
  });

  const [buyer] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, actor.userId))
    .limit(1);
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  let session;
  try {
    session = await stripe().checkout.sessions.create(
      {
        mode: "payment",
        client_reference_id: orderId,
        customer_email: buyer?.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: STRIPE_CURRENCY,
              unit_amount: pkg.totalCents,
              product_data: {
                name: pkg.name,
                description: `${pkg.credits} ${pkg.durationMinutes}-minute ${pkg.classType === "paired" ? "paired" : "individual"} class credits`,
              },
            },
          },
        ],
        metadata: { orderId, userId: actor.userId },
        payment_intent_data: {
          metadata: { orderId },
          transfer_group: `order_${orderId}`,
        },
        success_url: `${base}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/checkout?plan=${encodeURIComponent(pkg.id)}&canceled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour
      },
      { idempotencyKey: `checkout-${orderId}` },
    );
  } catch (error) {
    // Stripe unreachable or refused: the order never reached a payment page.
    await db
      .update(orders)
      .set({ status: "canceled" })
      .where(eq(orders.id, orderId));
    throw error;
  }

  await db
    .update(orders)
    .set({ providerRef: session.id })
    .where(eq(orders.id, orderId));
  if (!session.url) throw new Error("Stripe did not return a checkout URL.");
  return { orderId, url: session.url };
}

export type FulfillResult =
  | { status: "paid"; orderId: string; credits: number; balance: number }
  | { status: "already-paid"; orderId: string; credits: number }
  | { status: "unpaid" | "not-found" | "mismatch" };

/** Marks the order paid and adds its credits, exactly once. */
export async function fulfillStripeOrder(input: {
  sessionId: string;
  orderId: string | null | undefined;
  paymentStatus: string | null | undefined;
  amountTotal: number | null | undefined;
  paymentIntentId?: string | null;
}): Promise<FulfillResult> {
  if (!input.orderId) return { status: "not-found" };
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, input.orderId), eq(orders.provider, "stripe")))
    .limit(1);
  if (!order || order.providerRef !== input.sessionId)
    return { status: "not-found" };
  if (order.status === "paid")
    return {
      status: "already-paid",
      orderId: order.id,
      credits: order.credits,
    };
  if (input.paymentStatus !== "paid") return { status: "unpaid" };
  if (input.amountTotal !== order.totalCents) {
    await recordAuditEvent({
      action: "order.amount_mismatch",
      severity: "critical",
      targetType: "order",
      targetId: order.id,
      metadata: {
        expected: order.totalCents,
        received: input.amountTotal,
        sessionId: input.sessionId,
      },
    });
    return { status: "mismatch" };
  }

  const unitValueCents = Math.max(1, Math.round(order.totalCents / order.credits));

  // Order → paid, account credited, ledger entry: one statement, and only if
  // the order was still pending (a second webhook delivery changes nothing).
  const result = await db.execute(sql`
    WITH paid AS (
      UPDATE orders SET status = 'paid'
      WHERE id = ${order.id} AND status = 'pending'
      RETURNING id, credits, class_type, duration_minutes, buyer_user_id,
        CASE WHEN pair_id IS NULL THEN 'user:' || buyer_user_id ELSE 'pair:' || pair_id END AS holder
    ), account AS (
      INSERT INTO credit_accounts (
        id, holder, class_type, duration_minutes, balance, avg_credit_value_cents, updated_at
      )
      SELECT ${randomUUID()}, paid.holder, paid.class_type, paid.duration_minutes, paid.credits, ${unitValueCents}, now()
      FROM paid
      ON CONFLICT (holder, class_type, duration_minutes)
      DO UPDATE SET
        balance = credit_accounts.balance + EXCLUDED.balance,
        avg_credit_value_cents = CASE
          WHEN credit_accounts.balance + EXCLUDED.balance <= 0 THEN 0
          ELSE ROUND(
            (
              credit_accounts.balance::numeric * credit_accounts.avg_credit_value_cents
              + EXCLUDED.balance::numeric * ${unitValueCents}
            ) / (credit_accounts.balance + EXCLUDED.balance)
          )::int
        END,
        updated_at = now()
      RETURNING id, balance
    ), entry AS (
      INSERT INTO credit_transactions (id, account_id, delta, reason, order_id, actor_user_id, note)
      SELECT ${randomUUID()}, account.id, paid.credits, 'purchase', paid.id, paid.buyer_user_id, 'Stripe payment'
      FROM account, paid
      RETURNING id
    )
    SELECT account.balance AS balance FROM account
  `);
  const row = rowsOf<{ balance: number }>(result)[0];
  if (!row)
    return {
      status: "already-paid",
      orderId: order.id,
      credits: order.credits,
    };

  await recordAuditEvent({
    action: "order.paid",
    actorUserId: order.buyerUserId,
    targetType: "order",
    targetId: order.id,
    metadata: {
      provider: "stripe",
      sessionId: input.sessionId,
      paymentIntent: input.paymentIntentId ?? null,
      credits: order.credits,
      totalCents: order.totalCents,
    },
  });
  return {
    status: "paid",
    orderId: order.id,
    credits: order.credits,
    balance: Number(row.balance),
  };
}

/** Return page fallback: asks Stripe for the session and fulfills it. */
export async function fulfillFromReturn(
  actor: AuthSession,
  sessionId: string,
): Promise<FulfillResult> {
  if (!sessionId.startsWith("cs_")) return { status: "not-found" };
  const session = await stripe().checkout.sessions.retrieve(sessionId);
  if (session.metadata?.userId !== actor.userId) return { status: "not-found" };
  return fulfillStripeOrder({
    sessionId: session.id,
    orderId: session.client_reference_id,
    paymentStatus: session.payment_status,
    amountTotal: session.amount_total,
    paymentIntentId:
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id,
  });
}

/** A checkout that expired or was abandoned. */
export async function cancelStripeOrder(
  sessionId: string,
  orderId: string | null | undefined,
) {
  if (!orderId) return;
  await db
    .update(orders)
    .set({ status: "canceled" })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.providerRef, sessionId),
        eq(orders.status, "pending"),
      ),
    );
}
