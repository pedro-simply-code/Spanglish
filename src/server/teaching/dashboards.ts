import { requestTime } from "@/server/request-time";
import { connection } from "next/server";
import { eq, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import type { AdminAlert, AdminStat } from "@/features/admin";
import type {
  ManagerBillingSnapshot,
  ManagerClassOperations,
  ManagerDashboardSnapshot,
  ManagerDashboardStat,
} from "@/features/staff/types";
import { nextLevelGap, teacherBadges, teacherLevelFor } from "@/lib/teacher-levels";
import { platformTakePercentForLevel, teacherSharePercent } from "@/lib/teacher-pay";
import { listTeachers } from "@/server/classes/teachers";
import { db } from "@/server/db";
import {
  classChangeRequests,
  classSessions,
  payoutBatches,
  teacherEarnings,
  teacherProfiles,
} from "@/server/db/schema";
import { stripeEnabled } from "@/server/payments/stripe";
import { countPendingApplications } from "@/server/teaching/applications";
import {
  accrueEarnings,
  formatCents,
  getFinanceSummary,
  getPayoutSettings,
  startOfMonth,
} from "@/server/teaching/earnings";
import { countPendingMaterials } from "@/server/materials/library";
import { listRecentRatings } from "@/server/teaching/ratings";
import { getTeacherStats } from "@/server/teaching/stats";

/* Real numbers for the teacher, manager and admin home pages. */

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

export type ManagerTeamRow = {
  id: string;
  name: string;
  image: string | null;
  headline: string;
  classesTaught: number;
  ratingAverage: number;
  ratingCount: number;
  levelName: string;
};

export type ManagerAttentionItem = {
  id: string;
  title: string;
  detail: string;
  href: string;
  severity: "high" | "normal" | "low";
};

export async function getManagerWorkQueue(): Promise<{ team: ManagerTeamRow[]; attention: ManagerAttentionItem[] }> {
  await connection();
  const t = await getTranslations("ops.teaching");
  await accrueEarnings();
  const teachers = await listTeachers();
  const [stats, applications, materials, changeRequests, batches, unbatched] = await Promise.all([
    getTeacherStats(teachers.map((teacher) => teacher.id)),
    countPendingApplications(),
    countPendingMaterials(),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(classChangeRequests)
      .where(eq(classChangeRequests.status, "pending"))
      .then((rows) => Number(rows[0]?.value ?? 0)),
    db
      .select({ status: payoutBatches.status, value: sql<number>`count(*)::int` })
      .from(payoutBatches)
      .groupBy(payoutBatches.status),
    db
      .select({
        teachers: sql<number>`count(distinct ${teacherEarnings.teacherId})::int`,
        cents: sql<number>`coalesce(sum(${teacherEarnings.amountCents}),0)::int`,
      })
      .from(teacherEarnings)
      .where(sql`${teacherEarnings.payoutBatchId} is null`),
  ]);
  const batchCount = (status: string) => Number(batches.find((row) => row.status === status)?.value ?? 0);

  const team = teachers
    .map((teacher) => {
      const row = stats.get(teacher.id)!;
      return {
        id: teacher.id,
        name: teacher.name,
        image: teacher.image,
        headline: teacher.headline,
        classesTaught: row.classesTaught,
        ratingAverage: row.ratingAverage,
        ratingCount: row.ratingCount,
        levelName: teacherLevelFor(row).name,
      };
    })
    .sort((a, b) => b.classesTaught - a.classesTaught);

  const attention: ManagerAttentionItem[] = [];
  if (applications) {
    attention.push({
      id: "applications",
      title: t(applications === 1 ? "attentionApplicationOne" : "attentionApplicationOther", { count: applications }),
      detail: t("attentionApplicationsDetail"),
      href: "/manager/applications",
      severity: "high",
    });
  }
  if (materials) {
    attention.push({
      id: "materials",
      title: t(materials === 1 ? "attentionMaterialOne" : "attentionMaterialOther", { count: materials }),
      detail: t("attentionMaterialsDetail"),
      href: "/manager/materials",
      severity: "normal",
    });
  }
  const unbatchedRow = unbatched[0];
  if (Number(unbatchedRow?.cents ?? 0) > 0) {
    attention.push({
      id: "unbatched",
      title: t("attentionUnbatchedTitle", { amount: formatCents(Number(unbatchedRow!.cents)) }),
      detail: t("attentionUnbatchedDetail", { count: unbatchedRow!.teachers }),
      href: "/manager/payouts",
      severity: "normal",
    });
  }
  if (changeRequests) {
    attention.push({
      id: "change-requests",
      title: t("attentionChangeTitle", { count: changeRequests }),
      detail: t("attentionChangeDetail"),
      href: "/manager/rooms",
      severity: "low",
    });
  }
  return { team, attention };
}

function formatInt(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function startOfWeekUtc(now: Date): Date {
  const day = now.getUTCDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() + mondayOffset);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

function endOfWeekUtc(now: Date): Date {
  const start = startOfWeekUtc(now);
  return new Date(start.getTime() + 7 * 86_400_000);
}

async function getManagerClassOperations(now: Date): Promise<ManagerClassOperations> {
  await connection();
  const weekStart = startOfWeekUtc(now);
  const weekEnd = endOfWeekUtc(now);
  const [classRow, changeRow] = await Promise.all([
    db
      .select({
        classesThisWeek: sql<number>`count(*) filter (where ${classSessions.startsAt} >= ${weekStart} and ${classSessions.startsAt} < ${weekEnd} and ${classSessions.status} = 'scheduled')::int`,
        upcoming: sql<number>`count(*) filter (where ${classSessions.status} = 'scheduled' and ${classSessions.endsAt} > ${now})::int`,
        liveNow: sql<number>`count(*) filter (where ${classSessions.status} = 'scheduled' and ${classSessions.startsAt} <= ${now} and ${classSessions.endsAt} > ${now})::int`,
        deliveredThisWeek: sql<number>`count(*) filter (where ${classSessions.endsAt} >= ${weekStart} and ${classSessions.endsAt} < ${weekEnd} and ${classSessions.endsAt} <= ${now} and ${classSessions.status} = 'scheduled')::int`,
      })
      .from(classSessions),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(classChangeRequests)
      .where(eq(classChangeRequests.status, "pending")),
  ]);

  const row = classRow[0];
  return {
    classesThisWeek: Number(row?.classesThisWeek ?? 0),
    upcoming: Number(row?.upcoming ?? 0),
    liveNow: Number(row?.liveNow ?? 0),
    deliveredThisWeek: Number(row?.deliveredThisWeek ?? 0),
    pendingChangeRequests: Number(changeRow[0]?.value ?? 0),
  };
}

async function getManagerBillingSnapshot(): Promise<ManagerBillingSnapshot> {
  const summary = await getFinanceSummary();
  return {
    revenueCents: summary.revenueCents,
    paidOrders: summary.orders,
    creditsOutstanding: summary.creditsOutstanding,
    deferredRevenueCents: summary.deferredRevenueCents,
    teacherUnbatchedCents: summary.teacherUnbatchedCents,
    teacherEarnedThisMonthCents: summary.teacherEarnedThisMonthCents,
  };
}

async function buildManagerStats(input: {
  applications: number;
  materials: number;
  operations: ManagerClassOperations;
  billing: ManagerBillingSnapshot;
  teacherCount: number;
}): Promise<ManagerDashboardStat[]> {
  const t = await getTranslations("ops.teaching");
  return [
    {
      id: "applications",
      label: t("statApplicationsLabel"),
      value: formatInt(input.applications),
      helper: t(input.applications === 1 ? "statApplicationsHelperOne" : "statApplicationsHelperOther"),
      href: "/manager/applications",
    },
    {
      id: "materials",
      label: t("statMaterialsLabel"),
      value: formatInt(input.materials),
      helper: t("statMaterialsHelper"),
      href: "/manager/materials",
    },
    {
      id: "classes-week",
      label: t("statClassesWeekLabel"),
      value: formatInt(input.operations.classesThisWeek),
      helper: t("statClassesWeekHelper", { live: input.operations.liveNow, upcoming: input.operations.upcoming }),
      href: "/apps/calendar",
    },
    {
      id: "payouts-prep",
      label: t("statUnbatchedLabel"),
      value: formatCents(input.billing.teacherUnbatchedCents),
      helper: t("statUnbatchedHelper", { count: formatInt(input.teacherCount) }),
      href: "/manager/payouts",
    },
  ];
}

/** Manager home: operations queue, class totals, and billing the manager can act on. */
export async function getManagerDashboardSnapshot(): Promise<ManagerDashboardSnapshot> {
  await requestTime();
  const now = new Date();
  const [queue, applications, materials, operations, billing, teachers] = await Promise.all([
    getManagerWorkQueue(),
    countPendingApplications(),
    countPendingMaterials(),
    getManagerClassOperations(now),
    getManagerBillingSnapshot(),
    listTeachers(),
  ]);

  return {
    stats: await buildManagerStats({
      applications,
      materials,
      operations,
      billing,
      teacherCount: teachers.length,
    }),
    team: queue.team.slice(0, 8),
    attention: queue.attention,
    operations,
    billing,
    teacherCount: teachers.length,
  };
}

/** Finance tiles and alerts for the admin home page. */
export async function getAdminFinanceOverview(): Promise<{ stats: AdminStat[]; alerts: AdminAlert[] }> {
  await connection();
  const t = await getTranslations("ops.teaching");
  const [summary, open] = await Promise.all([
    getFinanceSummary(),
    db
      .select({
        status: payoutBatches.status,
        value: sql<number>`count(*)::int`,
        cents: sql<number>`coalesce(sum(${payoutBatches.totalCents}),0)::int`,
        oldest: sql<string | null>`min(coalesce(${payoutBatches.approvedAt}, ${payoutBatches.createdAt}))`,
      })
      .from(payoutBatches)
      .groupBy(payoutBatches.status),
  ]);
  const daysSince = (value: string | null | undefined) =>
    value ? Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000) : 0;
  const waiting = open.find((row) => row.status === "awaiting_approval");
  const toPay = open.find((row) => row.status === "approved");
  const stats: AdminStat[] = [
    {
      id: "revenue",
      label: t("statRevenueLabel"),
      value: formatCents(summary.revenueCents),
      helper: t("statRevenueHelper", { orders: summary.orders, credits: summary.creditsSold }),
      href: "/admin/finance/ledger",
    },
    {
      id: "deferred",
      label: t("statDeferredLabel"),
      value: formatCents(summary.deferredRevenueCents),
      helper: t("statDeferredHelper", { count: summary.creditsOutstanding }),
      href: "/admin/finance/ledger",
    },
    {
      id: "teacher-earned",
      label: t("statTeacherEarnedLabel"),
      value: formatCents(summary.teacherEarnedThisMonthCents),
      helper: t("statTeacherEarnedHelper", { amount: formatCents(summary.teacherUnbatchedCents) }),
      href: "/admin/finance/payouts",
    },
    {
      id: "teacher-paid",
      label: t("statTeacherPaidLabel"),
      value: formatCents(summary.teacherPaidCents),
      helper: t("statTeacherPaidHelper", { amount: formatCents(summary.teacherEarnedCents) }),
      href: "/admin/finance/payouts",
    },
  ];
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
  const now = new Date();
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
  return { stats, alerts };
}
