import { randomUUID } from "node:crypto";
import { and, asc, count, desc, eq, gt, isNotNull, lt, ne, or, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { aiPackMath, type AiPricingConfig } from "@/lib/ai-credit-pricing";
import { appNowDate } from "@/lib/app-clock";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { rowsOf } from "@/server/credits/credits";
import { db } from "@/server/db";
import {
  aiConversations,
  aiCreditAccounts,
  aiCreditOrders,
  aiCreditPacks,
  aiCreditTransactions,
  classParticipants,
  classSessions,
  users,
  type AiConversationBilling,
  type AiConversationMode,
  type AiCreditReason,
} from "@/server/db/schema";
import { checkoutUsesStripe, getPaymentProviderSettings } from "@/server/payments/provider-settings";
import { STRIPE_CURRENCY, stripe } from "@/server/payments/stripe";

/*
 * AI credits. 1 credit = 1 new conversation with Luna (voice) or in the chat.
 * - Every attended class gives AI_FREE_CONVERSATIONS_PER_CLASS free
 *   conversations for each practice; they add up and do not expire.
 * - Free ones are used first; after that a new conversation spends 1 bought
 *   credit (ai_credit_accounts, never below zero).
 * - Packs are on sale from admin → pricing (ai_credit_packs). With Stripe
 *   checkout enabled the student pays on Stripe and the credits arrive with the
 *   confirmed payment; otherwise a `demo` order adds them right away.
 * - AI orders live in ai_credit_orders, apart from class orders, so teacher
 *   payouts and class revenue are not affected.
 */

export type AiCreditPack = {
  id: string;
  name: string;
  priceCents: number;
  marginPercent: number;
  active: boolean;
  sortOrder: number;
  /** Conversations it gives now (from env; see src/lib/ai-credit-pricing.ts). */
  credits: number;
};

/** Pricing inputs from env: changing them updates every pack and screen. */
export function aiPricingConfig(): AiPricingConfig {
  return {
    tokensPerConversation: env.AI_CONVERSATION_TOKEN_LIMIT,
    usdPerMillionTokens: env.AI_CREDIT_USD_PER_MTOK,
    costMultiplier: env.AI_CREDIT_COST_MULTIPLIER,
    stripePercent: env.PAYMENT_FEE_PERCENT,
    stripeFixedCents: env.PAYMENT_FEE_FIXED_CENTS,
  };
}

export type AiModeAllowance = { total: number; used: number; left: number };

export type AiAllowance = {
  attendedClasses: number;
  perClass: number;
  free: Record<AiConversationMode, AiModeAllowance>;
  /** Bought credits left (shared by Luna and the chat). */
  credits: number;
};

export type AiCreditMovement = {
  id: string;
  delta: number;
  reason: AiCreditReason;
  note: string | null;
  createdAt: string;
};

export type AiCreditOrderView = {
  id: string;
  packId: string | null;
  credits: number;
  totalCents: number;
  currency: string;
  status: string;
  createdAt: string;
};

/** Past, not canceled classes the student joined (same rule as their progress page). */
export async function attendedClassCount(userId: string) {
  const [row] = await db
    .select({ value: count() })
    .from(classParticipants)
    .innerJoin(classSessions, eq(classSessions.id, classParticipants.sessionId))
    .where(
      and(
        eq(classParticipants.userId, userId),
        ne(classSessions.status, "canceled"),
        lt(classSessions.endsAt, appNowDate()),
        or(isNotNull(classParticipants.firstJoinedAt), gt(classParticipants.secondsPresent, 0)),
      ),
    );
  return Number(row?.value ?? 0);
}

async function freeUsed(userId: string) {
  const rows = await db
    .select({ mode: aiConversations.mode, value: count() })
    .from(aiConversations)
    .where(and(eq(aiConversations.userId, userId), eq(aiConversations.billing, "free")))
    .groupBy(aiConversations.mode);
  const used: Record<AiConversationMode, number> = { voice: 0, chat: 0 };
  for (const row of rows) used[row.mode] = Number(row.value);
  return used;
}

export async function aiCreditBalance(userId: string) {
  const [row] = await db
    .select({ balance: aiCreditAccounts.balance })
    .from(aiCreditAccounts)
    .where(eq(aiCreditAccounts.userId, userId))
    .limit(1);
  return row?.balance ?? 0;
}

/** Free conversations left per practice and the bought credits. */
export async function getAiAllowance(userId: string): Promise<AiAllowance> {
  const [attendedClasses, used, credits] = await Promise.all([
    attendedClassCount(userId),
    freeUsed(userId),
    aiCreditBalance(userId),
  ]);
  const perClass = env.AI_FREE_CONVERSATIONS_PER_CLASS;
  const total = attendedClasses * perClass;
  const mode = (value: number): AiModeAllowance => ({ total, used: value, left: Math.max(0, total - value) });
  return { attendedClasses, perClass, free: { voice: mode(used.voice), chat: mode(used.chat) }, credits };
}

/**
 * Decides how a new conversation is paid: a free one if any is left for this
 * practice, otherwise 1 credit (taken now). Null when there is neither.
 * Call before inserting the conversation; `refundConversation` undoes it.
 */
export async function chargeConversation(
  userId: string,
  mode: AiConversationMode,
  conversationId: string,
): Promise<AiConversationBilling | null> {
  const allowance = await getAiAllowance(userId);
  if (allowance.free[mode].left > 0) return "free";

  // Only takes the credit if there is one (the check keeps it from going below zero).
  const result = await db.execute(sql`
    WITH spent AS (
      UPDATE ai_credit_accounts SET balance = balance - 1, updated_at = now()
      WHERE user_id = ${userId} AND balance >= 1
      RETURNING user_id
    ), entry AS (
      INSERT INTO ai_credit_transactions (id, user_id, delta, reason, conversation_id, note)
      SELECT ${randomUUID()}, spent.user_id, -1, 'use', ${conversationId}, ${mode}
      FROM spent
      RETURNING id
    )
    SELECT count(*)::int AS taken FROM spent
  `);
  const taken = Number(rowsOf<{ taken: number }>(result)[0]?.taken ?? 0);
  return taken > 0 ? "credit" : null;
}

/** Gives the credit back when the conversation could not be created. */
export async function refundConversation(userId: string, conversationId: string, billing: AiConversationBilling) {
  if (billing !== "credit") return;
  await addAiCredits({ userId, delta: 1, reason: "refund", conversationId });
}

async function addAiCredits(input: {
  userId: string;
  delta: number;
  reason: AiCreditReason;
  orderId?: string;
  conversationId?: string;
  note?: string | null;
}) {
  const result = await db.execute(sql`
    WITH account AS (
      INSERT INTO ai_credit_accounts (user_id, balance, updated_at)
      VALUES (${input.userId}, ${input.delta}, now())
      ON CONFLICT (user_id) DO UPDATE SET balance = ai_credit_accounts.balance + EXCLUDED.balance, updated_at = now()
      RETURNING user_id, balance
    ), entry AS (
      INSERT INTO ai_credit_transactions (id, user_id, delta, reason, order_id, conversation_id, note)
      SELECT ${randomUUID()}, account.user_id, ${input.delta}, ${input.reason}, ${input.orderId ?? null},
             ${input.conversationId ?? null}, ${input.note ?? null}
      FROM account
      RETURNING id
    )
    SELECT balance FROM account
  `);
  return Number(rowsOf<{ balance: number }>(result)[0]?.balance ?? 0);
}

/** The student's AI credit movements, newest first. */
export async function listAiCreditHistory(userId: string, limit = 200): Promise<AiCreditMovement[]> {
  const rows = await db
    .select()
    .from(aiCreditTransactions)
    .where(eq(aiCreditTransactions.userId, userId))
    .orderBy(desc(aiCreditTransactions.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    delta: row.delta,
    reason: row.reason,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function listAiCreditOrders(userId: string, limit = 50): Promise<AiCreditOrderView[]> {
  const rows = await db
    .select()
    .from(aiCreditOrders)
    .where(eq(aiCreditOrders.buyerUserId, userId))
    .orderBy(desc(aiCreditOrders.createdAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    packId: row.packId,
    credits: row.credits,
    totalCents: row.totalCents,
    currency: row.currency,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  }));
}

/* ---------------------------------- Packs ---------------------------------- */

const toPack = (row: typeof aiCreditPacks.$inferSelect): AiCreditPack => ({
  id: row.id,
  name: row.name,
  priceCents: row.priceCents,
  marginPercent: row.marginPercent,
  active: row.active,
  sortOrder: row.sortOrder,
  credits: aiPackMath(row.priceCents, row.marginPercent, aiPricingConfig()).credits,
});

export async function listAiCreditPacks(options?: { activeOnly?: boolean }): Promise<AiCreditPack[]> {
  const rows = await db
    .select()
    .from(aiCreditPacks)
    .where(options?.activeOnly ? eq(aiCreditPacks.active, true) : undefined)
    .orderBy(asc(aiCreditPacks.sortOrder), asc(aiCreditPacks.priceCents));
  return rows.map(toPack);
}

export type AiPackInput = { id?: string; name: string; priceUsd: number; marginPercent: number; active: boolean };

/** Creates or updates a pack (admin). */
export async function saveAiCreditPack(input: AiPackInput) {
  const name = input.name.trim().slice(0, 80);
  const marginPercent = Math.round(input.marginPercent);
  const priceCents = Math.round(input.priceUsd * 100);
  if (
    !name ||
    !Number.isFinite(marginPercent) ||
    marginPercent < 0 ||
    marginPercent > 90 ||
    priceCents < 100 ||
    priceCents > 100_000 ||
    // A pack must give at least one conversation after the card fee and the margin.
    aiPackMath(priceCents, marginPercent, aiPricingConfig()).credits < 1
  ) {
    return { ok: false as const };
  }
  const now = new Date();
  if (input.id) {
    await db
      .update(aiCreditPacks)
      .set({ name, priceCents, marginPercent, active: input.active, updatedAt: now })
      .where(eq(aiCreditPacks.id, input.id));
  } else {
    const [last] = await db
      .select({ value: sql<number>`coalesce(max(${aiCreditPacks.sortOrder}), 0)::int` })
      .from(aiCreditPacks);
    await db.insert(aiCreditPacks).values({
      id: `ai-${randomUUID().slice(0, 8)}`,
      name,
      priceCents,
      marginPercent,
      active: input.active,
      sortOrder: Number(last?.value ?? 0) + 1,
    });
  }
  return { ok: true as const };
}

export async function deleteAiCreditPack(id: string) {
  await db.delete(aiCreditPacks).where(eq(aiCreditPacks.id, id));
}

/* -------------------------------- Purchases -------------------------------- */

export type AiPurchaseResult =
  | { ok: true; credits: number; balance: number }
  | { ok: true; redirectUrl: string }
  | { ok: false; code: "PACK_NOT_FOUND" };

/** Buys a pack: Stripe Checkout when it is enabled, otherwise a demo order credited at once. */
export async function purchaseAiCreditPack(actor: AuthSession, packId: string): Promise<AiPurchaseResult> {
  const [pack] = await db
    .select()
    .from(aiCreditPacks)
    .where(and(eq(aiCreditPacks.id, packId), eq(aiCreditPacks.active, true)))
    .limit(1);
  if (!pack) return { ok: false, code: "PACK_NOT_FOUND" };
  // Conversations at today's settings; the order keeps them even if env changes later.
  const credits = aiPackMath(pack.priceCents, pack.marginPercent, aiPricingConfig()).credits;
  if (credits < 1) return { ok: false, code: "PACK_NOT_FOUND" };

  const orderId = randomUUID();
  if (checkoutUsesStripe(await getPaymentProviderSettings())) {
    const url = await startAiStripeCheckout(actor, { ...pack, credits }, orderId);
    return { ok: true, redirectUrl: url };
  }

  await db.insert(aiCreditOrders).values({
    id: orderId,
    buyerUserId: actor.userId,
    packId: pack.id,
    credits,
    totalCents: pack.priceCents,
    provider: "demo",
    status: "paid",
  });
  const balance = await addAiCredits({
    userId: actor.userId,
    delta: credits,
    reason: "purchase",
    orderId,
    note: pack.name,
  });
  await recordAuditEvent({
    action: "ai_order.paid",
    actorUserId: actor.userId,
    targetType: "order",
    targetId: orderId,
    metadata: { packId: pack.id, credits, totalCents: pack.priceCents, provider: "demo" },
  });
  return { ok: true, credits, balance };
}

async function startAiStripeCheckout(
  actor: AuthSession,
  pack: typeof aiCreditPacks.$inferSelect & { credits: number },
  orderId: string,
) {
  const t = await getTranslations("ops.payments");
  await db.insert(aiCreditOrders).values({
    id: orderId,
    buyerUserId: actor.userId,
    packId: pack.id,
    credits: pack.credits,
    totalCents: pack.priceCents,
    provider: "stripe",
    status: "pending",
  });
  const [buyer] = await db.select({ email: users.email }).from(users).where(eq(users.id, actor.userId)).limit(1);
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
              unit_amount: pack.priceCents,
              product_data: {
                name: pack.name,
                description: t("aiCheckoutProductDescription", { credits: pack.credits }),
              },
            },
          },
        ],
        // `kind` tells the webhook this is an AI credit order.
        metadata: { orderId, userId: actor.userId, kind: "ai" },
        payment_intent_data: { metadata: { orderId, kind: "ai" } },
        success_url: `${base}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${base}/credits?tab=buy&product=ai&canceled=1`,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      { idempotencyKey: `ai-checkout-${orderId}` },
    );
  } catch (error) {
    await db.update(aiCreditOrders).set({ status: "canceled" }).where(eq(aiCreditOrders.id, orderId));
    throw error;
  }
  await db.update(aiCreditOrders).set({ providerRef: session.id }).where(eq(aiCreditOrders.id, orderId));
  if (!session.url) throw new Error(t("stripeNoUrl"));
  return session.url;
}

export type AiFulfillResult =
  | { status: "paid" | "already-paid"; credits: number }
  | { status: "unpaid" | "not-found" | "mismatch" };

/** Marks the AI order paid and adds its credits, exactly once. */
export async function fulfillAiStripeOrder(input: {
  sessionId: string;
  orderId: string | null | undefined;
  paymentStatus: string | null | undefined;
  amountTotal: number | null | undefined;
}): Promise<AiFulfillResult> {
  if (!input.orderId) return { status: "not-found" };
  const [order] = await db
    .select()
    .from(aiCreditOrders)
    .where(and(eq(aiCreditOrders.id, input.orderId), eq(aiCreditOrders.provider, "stripe")))
    .limit(1);
  if (!order || order.providerRef !== input.sessionId) return { status: "not-found" };
  if (order.status === "paid") return { status: "already-paid", credits: order.credits };
  if (input.paymentStatus !== "paid") return { status: "unpaid" };
  if (input.amountTotal !== order.totalCents) {
    await recordAuditEvent({
      action: "ai_order.amount_mismatch",
      severity: "critical",
      targetType: "order",
      targetId: order.id,
      metadata: { expected: order.totalCents, received: input.amountTotal, sessionId: input.sessionId },
    });
    return { status: "mismatch" };
  }

  // Order → paid and credits added in one statement, only while it was pending
  // (a second webhook delivery changes nothing).
  const result = await db.execute(sql`
    WITH paid AS (
      UPDATE ai_credit_orders SET status = 'paid'
      WHERE id = ${order.id} AND status = 'pending'
      RETURNING id, buyer_user_id, credits
    ), account AS (
      INSERT INTO ai_credit_accounts (user_id, balance, updated_at)
      SELECT paid.buyer_user_id, paid.credits, now() FROM paid
      ON CONFLICT (user_id) DO UPDATE SET balance = ai_credit_accounts.balance + EXCLUDED.balance, updated_at = now()
      RETURNING user_id
    ), entry AS (
      INSERT INTO ai_credit_transactions (id, user_id, delta, reason, order_id)
      SELECT ${randomUUID()}, paid.buyer_user_id, paid.credits, 'purchase', paid.id FROM paid, account
      RETURNING id
    )
    SELECT count(*)::int AS paid FROM paid
  `);
  if (!Number(rowsOf<{ paid: number }>(result)[0]?.paid ?? 0)) {
    return { status: "already-paid", credits: order.credits };
  }

  await recordAuditEvent({
    action: "ai_order.paid",
    actorUserId: order.buyerUserId,
    targetType: "order",
    targetId: order.id,
    metadata: { provider: "stripe", sessionId: input.sessionId, credits: order.credits, totalCents: order.totalCents },
  });
  return { status: "paid", credits: order.credits };
}

export async function cancelAiStripeOrder(sessionId: string, orderId: string | null | undefined) {
  if (!orderId) return;
  await db
    .update(aiCreditOrders)
    .set({ status: "canceled" })
    .where(
      and(
        eq(aiCreditOrders.id, orderId),
        eq(aiCreditOrders.providerRef, sessionId),
        eq(aiCreditOrders.status, "pending"),
      ),
    );
}
