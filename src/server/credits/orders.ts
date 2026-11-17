import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import type { AuthSession } from "@/lib/auth-types";
import { normalizePricingPackageId } from "@/lib/pricing-package-schema";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { getActivePairForUser } from "@/server/classes/pairs";
import {
  changeCredits,
  holderFor,
  InsufficientCreditsError,
  pairHolder,
  rowsOf,
  userHolder,
  type ClassKind,
} from "@/server/credits/credits";
import { db } from "@/server/db";
import { orders, pricingPackages, users, type ClassType } from "@/server/db/schema";
import { startStripeCheckout } from "@/server/payments/checkout";
import { checkoutUsesStripe, getPaymentProviderSettings } from "@/server/payments/provider-settings";

/*
 * Package purchases. With STRIPE_SECRET_KEY set, checkout goes to Stripe
 * Checkout and credits arrive with the confirmed payment. Without it, a
 * `demo` order credits the package without charging (local development).
 */

export type PurchaseErrorCode = "PACKAGE_NOT_FOUND" | "NOT_PAIRED";

export type PurchaseResult =
  | { ok: true; orderId: string; credits: number; balance: number; shared: boolean }
  | { ok: true; orderId: string; redirectUrl: string }
  | { ok: false; code: PurchaseErrorCode; message: string };

export async function purchasePackage(
  actor: AuthSession,
  packageId: string,
): Promise<PurchaseResult> {
  const [pkg] = await db
    .select()
    .from(pricingPackages)
    .where(
      and(eq(pricingPackages.id, normalizePricingPackageId(packageId)), eq(pricingPackages.active, true)),
    )
    .limit(1);
  if (!pkg) {
    return { ok: false, code: "PACKAGE_NOT_FOUND", message: "That package is not on sale." };
  }

  const pair = pkg.classType === "paired" ? await getActivePairForUser(actor.userId) : null;
  if (pkg.classType === "paired" && !pair) {
    return {
      ok: false,
      code: "NOT_PAIRED",
      message: "Paired packages are shared by two students. Ask the academy to pair you first.",
    };
  }

  const providerSettings = await getPaymentProviderSettings();
  // With Stripe checkout enabled the student pays on Stripe; credits arrive with the
  // confirmed payment (src/server/payments/checkout.ts).
  if (checkoutUsesStripe(providerSettings)) {
    const checkout = await startStripeCheckout(actor, pkg, pair?.id ?? null);
    return { ok: true, orderId: checkout.orderId, redirectUrl: checkout.url };
  }

  const holder = holderFor({ classType: pkg.classType, userId: actor.userId, pairId: pair?.id })!;
  const orderId = randomUUID();
  const unitValueCents = Math.max(1, Math.round(pkg.totalCents / pkg.credits));

  // Order, account and ledger entry in one statement.
  const result = await db.execute(sql`
    WITH placed AS (
      INSERT INTO orders (id, buyer_user_id, pair_id, package_id, class_type, duration_minutes,
                          credits, total_cents, currency, provider, status)
      VALUES (${orderId}, ${actor.userId}, ${pair?.id ?? null}, ${pkg.id}, ${pkg.classType},
              ${pkg.durationMinutes}, ${pkg.credits}, ${pkg.totalCents}, 'USD', 'demo', 'paid')
      RETURNING id, credits
    ), account AS (
      INSERT INTO credit_accounts (
        id, holder, class_type, duration_minutes, balance, avg_credit_value_cents, updated_at
      )
      SELECT ${randomUUID()}, ${holder}, ${pkg.classType}, ${pkg.durationMinutes}, placed.credits, ${unitValueCents}, now()
      FROM placed
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
      SELECT ${randomUUID()}, account.id, placed.credits, 'purchase', placed.id, ${actor.userId}, ${pkg.name}
      FROM account, placed
      RETURNING id
    )
    SELECT account.balance AS balance FROM account
  `);
  const balance = Number(rowsOf<{ balance: number }>(result)[0]?.balance ?? pkg.credits);

  await recordAuditEvent({
    action: "order.paid",
    actorUserId: actor.userId,
    targetType: "order",
    targetId: orderId,
    metadata: { packageId: pkg.id, credits: pkg.credits, totalCents: pkg.totalCents, provider: "demo" },
  });

  return { ok: true, orderId, credits: pkg.credits, balance, shared: Boolean(pair) };
}

export type GrantErrorCode = "STUDENT_NOT_FOUND" | "NOT_PAIRED" | "INSUFFICIENT" | "INVALID_AMOUNT";

/** Managers add (or remove, with a negative amount) credits by hand. */
export async function grantCredits(input: {
  actor: AuthSession;
  studentEmail: string;
  kind: ClassKind;
  amount: number;
  note: string;
}): Promise<{ ok: true; balance: number } | { ok: false; code: GrantErrorCode; message: string }> {
  if (!Number.isInteger(input.amount) || input.amount === 0 || Math.abs(input.amount) > 500) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Use a whole number between -500 and 500 (not 0)." };
  }

  const [student] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, input.studentEmail.trim().toLowerCase()))
    .limit(1);
  if (!student) {
    return { ok: false, code: "STUDENT_NOT_FOUND", message: "No account with that email." };
  }

  let holder = userHolder(student.id);
  if (input.kind.classType === "paired") {
    const pair = await getActivePairForUser(student.id);
    if (!pair) {
      return { ok: false, code: "NOT_PAIRED", message: "Paired credits go to a pair; this student has none." };
    }
    holder = pairHolder(pair.id);
  }

  try {
    const unitValueCents =
      input.amount > 0 ? await (await import("@/server/pricing/credit-value")).referenceCreditValueCents(input.kind) : 0;
    const result = await changeCredits({
      holder,
      kind: input.kind,
      delta: input.amount,
      reason: input.amount > 0 ? "grant" : "adjustment",
      actorUserId: input.actor.userId,
      note: input.note.trim().slice(0, 200) || null,
      unitValueCents,
    });
    await recordAuditEvent({
      action: "credits.granted",
      actorUserId: input.actor.userId,
      targetType: "user",
      targetId: student.id,
      metadata: { holder, amount: input.amount, ...input.kind, note: input.note },
    });
    return { ok: true, balance: result.balance };
  } catch (error) {
    if (error instanceof InsufficientCreditsError) {
      return { ok: false, code: "INSUFFICIENT", message: "That would leave a negative balance." };
    }
    throw error;
  }
}

export type OrderSummary = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  classType: ClassType;
  durationMinutes: number;
  credits: number;
  totalCents: number;
  provider: string;
  createdAt: string;
};

export async function listRecentOrders(limit = 50): Promise<OrderSummary[]> {
  const rows = await db
    .select({
      id: orders.id,
      buyerName: users.name,
      buyerEmail: users.email,
      classType: orders.classType,
      durationMinutes: orders.durationMinutes,
      credits: orders.credits,
      totalCents: orders.totalCents,
      provider: orders.provider,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.buyerUserId))
    .orderBy(desc(orders.createdAt))
    .limit(limit);
  return rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));
}
