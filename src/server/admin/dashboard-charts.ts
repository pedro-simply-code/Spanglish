import { and, eq, gte } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import type { AdminDashboardCharts, AdminDaySeries } from "@/features/admin";
import { getAcademyEconomicsSnapshot } from "@/server/admin/class-economics";
import { db } from "@/server/db";
import { auditLogs, classSessions, orders, teacherEarnings } from "@/server/db/schema";
import { getFinanceSummary } from "@/server/teaching/earnings";
import { requestTime } from "@/server/request-time";

function shortWeekday(date: Date, locale: string) {
  return date.toLocaleDateString(locale, { weekday: "short", timeZone: "UTC" });
}

function buildWeekBuckets(locale: string): Array<{ key: string; label: string }> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() - 6);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setUTCDate(start.getUTCDate() + index);
    return { key: day.toISOString().slice(0, 10), label: shortWeekday(day, locale) };
  });
}

function emptySeries(buckets: Array<{ key: string; label: string }>): AdminDaySeries {
  return {
    categories: buckets.map((item) => item.label),
    values: buckets.map(() => 0),
  };
}

function fillDayCounts(
  buckets: Array<{ key: string; label: string }>,
  rows: { at: Date }[],
): AdminDaySeries {
  const series = emptySeries(buckets);
  const indexByKey = new Map(buckets.map((item, index) => [item.key, index]));
  for (const row of rows) {
    const key = row.at.toISOString().slice(0, 10);
    const index = indexByKey.get(key);
    if (index === undefined) continue;
    const value = series.values[index];
    if (value === undefined) continue;
    series.values[index] = value + 1;
  }
  return series;
}

function fillDayAmounts(
  buckets: Array<{ key: string; label: string }>,
  rows: { at: Date; cents: number }[],
): AdminDaySeries {
  const series = emptySeries(buckets);
  const indexByKey = new Map(buckets.map((item, index) => [item.key, index]));
  for (const row of rows) {
    const key = row.at.toISOString().slice(0, 10);
    const index = indexByKey.get(key);
    if (index === undefined) continue;
    const value = series.values[index];
    if (value === undefined) continue;
    series.values[index] = value + row.cents / 100;
  }
  return series;
}

export async function getAdminDashboardCharts(): Promise<AdminDashboardCharts> {
  await requestTime();
  const [t, locale] = await Promise.all([getTranslations("admin"), getLocale()]);

  const buckets = buildWeekBuckets(locale);
  const rangeStart = new Date();
  rangeStart.setUTCHours(0, 0, 0, 0);
  rangeStart.setUTCDate(rangeStart.getUTCDate() - 6);

  const [snapshot, finance, sessions, paidOrders, earnings, audits] = await Promise.all([
    getAcademyEconomicsSnapshot(),
    getFinanceSummary(),
    db
      .select({ startsAt: classSessions.startsAt })
      .from(classSessions)
      .where(gte(classSessions.startsAt, rangeStart)),
    db
      .select({ createdAt: orders.createdAt, totalCents: orders.totalCents })
      .from(orders)
      .where(and(eq(orders.status, "paid"), gte(orders.createdAt, rangeStart))),
    db
      .select({ classEndedAt: teacherEarnings.classEndedAt, amountCents: teacherEarnings.amountCents })
      .from(teacherEarnings)
      .where(gte(teacherEarnings.classEndedAt, rangeStart)),
    db
      .select({ createdAt: auditLogs.createdAt })
      .from(auditLogs)
      .where(gte(auditLogs.createdAt, rangeStart)),
  ]);

  const classesByDay = fillDayCounts(
    buckets,
    sessions.map((row) => ({ at: row.startsAt })),
  );

  return {
    classStatus: [
      { label: t("classStatus.upcoming"), value: snapshot.upcoming },
      { label: t("classStatus.inProgress"), value: snapshot.inProgress },
      { label: t("classStatus.completed"), value: snapshot.completed },
      { label: t("classStatus.canceled"), value: snapshot.canceled },
    ],
    classesByDay,
    classTypeMix: {
      oneOnOne: snapshot.oneOnOneSharePct,
      paired: snapshot.pairedSharePct,
    },
    paidRevenueByDay: fillDayAmounts(
      buckets,
      paidOrders.map((row) => ({ at: row.createdAt, cents: row.totalCents })),
    ),
    paidOrdersByDay: fillDayCounts(
      buckets,
      paidOrders.map((row) => ({ at: row.createdAt })),
    ),
    teacherEarningsByDay: fillDayAmounts(
      buckets,
      earnings.map((row) => ({ at: row.classEndedAt, cents: row.amountCents })),
    ),
    classesDeliveredByDay: fillDayCounts(
      buckets,
      earnings.map((row) => ({ at: row.classEndedAt })),
    ),
    auditEventsByDay: fillDayCounts(
      buckets,
      audits.map((row) => ({ at: row.createdAt })),
    ),
    financeTotalsUsd: {
      revenue: finance.revenueCents / 100,
      earned: finance.teacherEarnedCents / 100,
      paid: finance.teacherPaidCents / 100,
      unbatched: finance.teacherUnbatchedCents / 100,
    },
  };
}