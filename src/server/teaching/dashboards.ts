import { connection } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getLocale, getTranslations } from "next-intl/server";
import type { AdminAlert } from "@/features/admin";
import { appNowDate } from "@/lib/app-clock";
import { nextLevelGap, teacherBadges, teacherLevelFor } from "@/lib/teacher-levels";
import { platformTakePercentForLevel, teacherSharePercent } from "@/lib/teacher-pay";
import { db } from "@/server/db";
import {
  payoutBatches,
  teacherEarnings,
  teacherProfiles,
} from "@/server/db/schema";
import { stripeEnabled } from "@/server/payments/stripe";
import {
  accrueEarnings,
  getPayoutSettings,
  startOfMonth,
} from "@/server/teaching/earnings";
import { listRecentRatings } from "@/server/teaching/ratings";
import { getTeacherStats } from "@/server/teaching/stats";

/* Real numbers for the teacher and admin home pages (manager: manager-home.ts). */

export type TeacherDashboardExtras = {
  earnedThisMonthCents: number;
  unpaidCents: number;
  classesTaught: number;
  ratingAverage: number;
  ratingCount: number;
  levelName: string;
  levelPercent: number;
  nextLevel: { name: string; classes: number; ratings: number; rating: number } | null;
  badges: { id: string; label: string; description: string }[];
  recentRatings: { stars: number; comment: string | null; studentName: string; createdAt: string }[];
};

export async function getTeacherDashboardExtras(teacherId: string): Promise<TeacherDashboardExtras> {
  await connection();
  await accrueEarnings();
  const [statsMap, money, recentRatings, payoutSettings] = await Promise.all([
    getTeacherStats([teacherId]),
    db
      .select({
        month: sql<number>`coalesce(sum(${teacherEarnings.amountCents}) filter (where ${teacherEarnings.classEndedAt} >= ${startOfMonth()}),0)::int`,
        unpaid: sql<number>`coalesce(sum(${teacherEarnings.amountCents}) filter (where ${teacherEarnings.payoutBatchId} is null or ${teacherEarnings.payoutBatchId} in (select id from payout_batches where status <> 'paid')),0)::int`,
      })
      .from(teacherEarnings)
      .where(eq(teacherEarnings.teacherId, teacherId)),
    listRecentRatings(teacherId, 3),
    getPayoutSettings(),
  ]);
  const stats = statsMap.get(teacherId)!;
  const level = teacherLevelFor(stats);
  const gap = nextLevelGap(stats);
  const take = platformTakePercentForLevel(payoutSettings, level.level);
  return {
    earnedThisMonthCents: Number(money[0]?.month ?? 0),
    unpaidCents: Number(money[0]?.unpaid ?? 0),
    classesTaught: stats.classesTaught,
    ratingAverage: stats.ratingAverage,
    ratingCount: stats.ratingCount,
    levelName: level.name,
    levelPercent: teacherSharePercent(take),
    nextLevel: gap
      ? { name: gap.level.name, classes: gap.classes, ratings: gap.ratings, rating: gap.rating }
      : null,
    badges: teacherBadges(stats),
    recentRatings,
  };
}

/** Payout work only the admin can unblock (admin home "Needs your action"). */
export async function getPayoutAlerts(): Promise<AdminAlert[]> {
  await connection();
  const [t, locale] = await Promise.all([getTranslations("ops.teaching"), getLocale()]);
  // Same money format as the rest of the admin home.
  const formatCents = (cents: number) =>
    new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100);
  const now = appNowDate();
  const open = await db
    .select({
      status: payoutBatches.status,
      value: sql<number>`count(*)::int`,
      cents: sql<number>`coalesce(sum(${payoutBatches.totalCents}),0)::int`,
      oldest: sql<string | null>`min(coalesce(${payoutBatches.approvedAt}, ${payoutBatches.createdAt}))`,
    })
    .from(payoutBatches)
    .groupBy(payoutBatches.status);
  const daysSince = (value: string | null | undefined) =>
    value ? Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000) : 0;
  const waiting = open.find((row) => row.status === "awaiting_approval");
  const toPay = open.find((row) => row.status === "approved");
  const alerts: AdminAlert[] = [];
  if (Number(waiting?.value ?? 0) > 0) {
    const days = daysSince(waiting!.oldest);
    alerts.push({
      id: "payouts-awaiting",
      title: t("alertAwaitingTitle", { count: waiting!.value }),
      detail: t("alertAwaitingDetail", {
        amount: formatCents(Number(waiting!.cents)),
        waiting: days >= 1 ? t("alertWaitingSuffix", { days }) : "",
      }),
      severity: days >= 3 ? "critical" : "warning",
      href: "/admin/finance/payouts",
    });
  }
  if (Number(toPay?.value ?? 0) > 0) {
    const days = daysSince(toPay!.oldest);
    alerts.push({
      id: "payouts-to-pay",
      title: t("alertToPayTitle", { count: toPay!.value }),
      detail: t("alertToPayDetail", {
        amount: formatCents(Number(toPay!.cents)),
        approved: days >= 1 ? t("alertApprovedSuffix", { days }) : "",
      }),
      severity: days >= 3 ? "warning" : "info",
      href: "/admin/finance/payouts",
    });
  }

  // Last month closed but nobody prepared its payout yet (from the 5th).
  const monthStart = startOfMonth(now);
  if (now.getUTCDate() >= 5) {
    const [late] = await db
      .select({ cents: sql<number>`coalesce(sum(${teacherEarnings.amountCents}),0)::int` })
      .from(teacherEarnings)
      .where(sql`${teacherEarnings.payoutBatchId} is null and ${teacherEarnings.classEndedAt} < ${monthStart}`);
    if (Number(late?.cents ?? 0) > 0) {
      alerts.push({
        id: "payouts-not-prepared",
        title: t("alertNotPreparedTitle"),
        detail: t("alertNotPreparedDetail", { amount: formatCents(Number(late!.cents)) }),
        severity: "info",
        href: "/admin/finance/payouts",
      });
    }
  }

  // With Stripe, teachers who will be paid soon but cannot receive transfers.
  if (stripeEnabled) {
    const [missing] = await db
      .select({ count: sql<number>`count(distinct ${teacherEarnings.teacherId})::int` })
      .from(teacherEarnings)
      .leftJoin(teacherProfiles, eq(teacherProfiles.userId, teacherEarnings.teacherId))
      .leftJoin(payoutBatches, eq(payoutBatches.id, teacherEarnings.payoutBatchId))
      .where(
        sql`(${teacherEarnings.payoutBatchId} is null or ${payoutBatches.status} in ('awaiting_approval','approved'))
            and coalesce(${teacherProfiles.stripeReady}, false) = false`,
      );
    if (Number(missing?.count ?? 0) > 0) {
      alerts.push({
        id: "teachers-without-stripe",
        title: t("alertNoStripeTitle", { count: missing!.count }),
        detail: t("alertNoStripeDetail"),
        severity: "warning",
        href: "/admin/finance/payouts",
      });
    }
  }
  return alerts;
}
