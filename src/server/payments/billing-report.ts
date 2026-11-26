import { connection } from "next/server";
import { desc, eq, sql } from "drizzle-orm";
import { appNowDate } from "@/lib/app-clock";
import { db } from "@/server/db";
import { aiCreditOrders, orders, users, type OrderProvider, type OrderStatus } from "@/server/db/schema";

/*
 * Manager → billing, from the real orders: class packages (orders) and AI
 * credit packs (ai_credit_orders), whatever the provider (Stripe, demo, manual).
 */

export type BillingOrderRow = {
  id: string;
  kind: "classes" | "ai";
  buyerName: string;
  buyerEmail: string;
  credits: number;
  classType: string | null;
  durationMinutes: number | null;
  totalCents: number;
  currency: string;
  status: OrderStatus;
  provider: OrderProvider;
  createdAt: string;
};

export type BillingSummary = {
  /** This calendar month (UTC). */
  paidCents: number;
  paidOrders: number;
  classCents: number;
  aiCents: number;
  /** Payments started and not finished (any month). */
  pendingCents: number;
  pendingOrders: number;
  /** Refunded this month. */
  refundedCents: number;
  refundedOrders: number;
  buyers: number;
};

export type BillingReport = { summary: BillingSummary; recent: BillingOrderRow[] };

function monthStart() {
  const now = appNowDate();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export async function getBillingReport(recentLimit = 20): Promise<BillingReport> {
  // Uses the current date: render at request time.
  await connection();
  const since = monthStart();
  const totals = (table: typeof orders | typeof aiCreditOrders) =>
    db
      .select({
        status: table.status,
        thisMonth: sql<boolean>`${table.createdAt} >= ${since}`,
        orders: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${table.totalCents}), 0)::bigint`,
        buyers: sql<string[]>`array_agg(distinct ${table.buyerUserId})`,
      })
      .from(table)
      .groupBy(sql`1, 2`);

  const buyer = { buyerName: users.name, buyerEmail: users.email };
  const [classTotals, aiTotals, classRecent, aiRecent] = await Promise.all([
    totals(orders),
    totals(aiCreditOrders),
    db
      .select({
        id: orders.id,
        ...buyer,
        credits: orders.credits,
        classType: orders.classType,
        durationMinutes: orders.durationMinutes,
        totalCents: orders.totalCents,
        currency: orders.currency,
        status: orders.status,
        provider: orders.provider,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.buyerUserId))
      .orderBy(desc(orders.createdAt))
      .limit(recentLimit),
    db
      .select({
        id: aiCreditOrders.id,
        ...buyer,
        credits: aiCreditOrders.credits,
        totalCents: aiCreditOrders.totalCents,
        currency: aiCreditOrders.currency,
        status: aiCreditOrders.status,
        provider: aiCreditOrders.provider,
        createdAt: aiCreditOrders.createdAt,
      })
      .from(aiCreditOrders)
      .innerJoin(users, eq(users.id, aiCreditOrders.buyerUserId))
      .orderBy(desc(aiCreditOrders.createdAt))
      .limit(recentLimit),
  ]);

  const summary: BillingSummary = {
    paidCents: 0,
    paidOrders: 0,
    classCents: 0,
    aiCents: 0,
    pendingCents: 0,
    pendingOrders: 0,
    refundedCents: 0,
    refundedOrders: 0,
    buyers: 0,
  };
  const buyers = new Set<string>();
  for (const [kind, rows] of [["classes", classTotals], ["ai", aiTotals]] as const) {
    for (const row of rows) {
      const cents = Number(row.cents);
      if (row.status === "pending") {
        summary.pendingCents += cents;
        summary.pendingOrders += Number(row.orders);
      }
      if (!row.thisMonth) continue;
      if (row.status === "paid") {
        summary.paidCents += cents;
        summary.paidOrders += Number(row.orders);
        if (kind === "classes") summary.classCents += cents;
        else summary.aiCents += cents;
        for (const id of row.buyers ?? []) buyers.add(id);
      } else if (row.status === "refunded") {
        summary.refundedCents += cents;
        summary.refundedOrders += Number(row.orders);
      }
    }
  }
  summary.buyers = buyers.size;

  const recent: BillingOrderRow[] = [
    ...classRecent.map((row) => ({ ...row, kind: "classes" as const })),
    ...aiRecent.map((row) => ({ ...row, kind: "ai" as const, classType: null, durationMinutes: null })),
  ]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, recentLimit)
    .map((row) => ({ ...row, createdAt: row.createdAt.toISOString() }));

  return { summary, recent };
}
