import { connection } from "next/server";
import { and, eq, gte, sql } from "drizzle-orm";
import { env } from "@/env";
import { appNowDate } from "@/lib/app-clock";
import { db } from "@/server/db";
import { aiConversations, aiCreditOrders, classSummaries } from "@/server/db/schema";

/*
 * What Claude really costs vs what AI credits sell for, month by month, so a
 * model or price change that eats the margin shows up in the admin.
 * Costs are the ones saved with each call (AI_PRICE_*_PER_MTOK); conversations
 * count in the month they started. Amounts in cents (costs keep fractions).
 */

export type AiCostMonth = {
  /** YYYY-MM */
  month: string;
  freeConversations: number;
  paidConversations: number;
  /** Claude cost of free conversations (cents). */
  freeCostCents: number;
  /** Claude cost of conversations paid with credits (cents). */
  paidCostCents: number;
  /** Class summaries written by Claude (cents). */
  summaryCostCents: number;
  /** AI credit packs sold and paid (cents). */
  revenueCents: number;
  /** Estimated card fees on those sales (cents). */
  feeCents: number;
  /** Revenue − fees − every Claude cost (cents). */
  marginCents: number;
};

const microsToCents = (micros: number) => micros / 10_000;

function monthStart(date: Date, monthsBack: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - monthsBack, 1));
}

export async function aiCostReport(months = 3): Promise<AiCostMonth[]> {
  // Uses the current date: render at request time.
  await connection();
  const since = monthStart(appNowDate(), months - 1);
  const monthOf = (column: Parameters<typeof sql>[1]) => sql<string>`to_char(date_trunc('month', ${column}), 'YYYY-MM')`;

  const [conversationRows, summaryRows, orderRows] = await Promise.all([
    db
      .select({
        month: monthOf(aiConversations.createdAt),
        free: sql<boolean>`${aiConversations.billing} = 'free'`,
        count: sql<number>`count(*)::int`,
        micros: sql<number>`coalesce(sum(${aiConversations.costMicros}), 0)::bigint`,
      })
      .from(aiConversations)
      .where(gte(aiConversations.createdAt, since))
      .groupBy(sql`1, 2`),
    db
      .select({
        month: monthOf(classSummaries.createdAt),
        micros: sql<number>`coalesce(sum(${classSummaries.costMicros}), 0)::bigint`,
      })
      .from(classSummaries)
      .where(gte(classSummaries.createdAt, since))
      .groupBy(sql`1`),
    db
      .select({
        month: monthOf(aiCreditOrders.createdAt),
        orders: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${aiCreditOrders.totalCents}), 0)::bigint`,
      })
      .from(aiCreditOrders)
      .where(and(gte(aiCreditOrders.createdAt, since), eq(aiCreditOrders.status, "paid")))
      .groupBy(sql`1`),
  ]);

  const report: AiCostMonth[] = [];
  for (let back = months - 1; back >= 0; back--) {
    const start = monthStart(appNowDate(), back);
    const month = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
    const free = conversationRows.find((row) => row.month === month && row.free);
    const paid = conversationRows.filter((row) => row.month === month && !row.free);
    const summaries = summaryRows.find((row) => row.month === month);
    const orders = orderRows.find((row) => row.month === month);

    const revenueCents = Number(orders?.cents ?? 0);
    const orderCount = Number(orders?.orders ?? 0);
    const feeCents = Math.round(revenueCents * (env.PAYMENT_FEE_PERCENT / 100) + orderCount * env.PAYMENT_FEE_FIXED_CENTS);
    const freeCostCents = microsToCents(Number(free?.micros ?? 0));
    const paidCostCents = microsToCents(paid.reduce((total, row) => total + Number(row.micros), 0));
    const summaryCostCents = microsToCents(Number(summaries?.micros ?? 0));
    report.push({
      month,
      freeConversations: Number(free?.count ?? 0),
      paidConversations: paid.reduce((total, row) => total + Number(row.count), 0),
      freeCostCents,
      paidCostCents,
      summaryCostCents,
      revenueCents,
      feeCents,
      marginCents: revenueCents - feeCents - freeCostCents - paidCostCents - summaryCostCents,
    });
  }
  return report.reverse();
}
