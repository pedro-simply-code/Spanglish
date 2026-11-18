import { connection } from "next/server";
import { academyPlans } from "@/features/academy";
import { getClassStatus, type LiveClass } from "@/features/classes";
import type {
  AcademyEconomicsSnapshot,
  AdminStat,
  LedgerSnapshot,
  ManagerDashboardStat,
  PayoutBatch,
  TeacherEarningsRow,
} from "@/features/admin";
import { listAllClasses } from "@/server/classes/class-repository";
import type { AdminTranslator } from "@/server/admin/translator";
import { listPricingPackageRows } from "@/server/pricing/packages";

/** Share of student price paid to teachers for delivered classes (until earnings table exists). */
const TEACHER_PAYOUT_SHARE = 0.55;

export type { AcademyEconomicsSnapshot, ManagerDashboardStat, TeacherEarningsRow };

function formatUsd(amount: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatInt(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(value);
}

function priceKey(item: LiveClass) {
  return `${item.type}-${item.duration}`;
}

async function buildPricePerClassUsd(): Promise<Map<string, number>> {
  const rows = await listPricingPackageRows({ activeOnly: true });
  const map = new Map<string, number>();

  for (const row of rows) {
    const key = `${row.classType}-${row.durationMinutes}`;
    if (!map.has(key)) {
      map.set(key, row.pricePerClassCents / 100);
    }
  }

  if (map.size === 0) {
    for (const plan of academyPlans) {
      const key = `${plan.type}-${plan.duration}`;
      if (!map.has(key)) {
        map.set(key, plan.pricePerClass);
      }
    }
  }

  return map;
}

function studentPriceUsd(item: LiveClass, prices: Map<string, number>): number {
  const base = prices.get(priceKey(item)) ?? 16;
  return item.type === "paired" ? base / 2 : base;
}

function isCreditRefunded(item: LiveClass, status: ReturnType<typeof getClassStatus>) {
  return status === "canceled" && item.cancellation?.creditRefunded === true;
}

function countsAsAttended(item: LiveClass, status: ReturnType<typeof getClassStatus>) {
  if (status !== "completed") return false;
  return item.attended !== false;
}

function startOfWeekLocal(nowIso: string): number {
  const now = new Date(nowIso);
  const day = now.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const start = new Date(now);
  start.setDate(now.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);
  return start.getTime();
}

function endOfWeekLocal(nowIso: string): number {
  const start = startOfWeekLocal(nowIso);
  return start + 7 * 24 * 3_600_000;
}

export async function getAcademyEconomicsSnapshot(
  nowIso?: string,
): Promise<AcademyEconomicsSnapshot> {
  // Live data: never prerender (and read the clock only at request time).
  await connection();
  nowIso ??= new Date().toISOString();
  const [items, prices] = await Promise.all([listAllClasses({ limit: 5000 }), buildPricePerClassUsd()]);

  let upcoming = 0;
  let inProgress = 0;
  let completed = 0;
  let canceled = 0;
  let attendedCompleted = 0;
  let creditsBooked = 0;
  let creditsDelivered = 0;
  let grossDeliveredUsd = 0;
  let pipelineRevenueUsd = 0;
  let classesThisWeek = 0;
  let oneOnOne = 0;
  let paired = 0;

  const weekStart = startOfWeekLocal(nowIso);
  const weekEnd = endOfWeekLocal(nowIso);

  const taughtSessions = new Set<string>();
  const teacherStats = new Map<
    string,
    { sessions: Set<string>; grossUsd: number; payoutUsd: number }
  >();

  for (const item of items) {
    const status = getClassStatus(item, nowIso);
    if (status === "upcoming") upcoming += 1;
    else if (status === "in-progress") inProgress += 1;
    else if (status === "completed") completed += 1;
    else canceled += 1;

    if (isCreditRefunded(item, status)) continue;

    const price = studentPriceUsd(item, prices) * (item.creditCost || 1);
    creditsBooked += item.creditCost || 1;

    const startMs = new Date(item.startsAt).getTime();
    if (startMs >= weekStart && startMs < weekEnd && status !== "canceled") {
      classesThisWeek += 1;
    }

    if (item.type === "paired") paired += 1;
    else oneOnOne += 1;

    if (status === "upcoming" || status === "in-progress") {
      pipelineRevenueUsd += price;
    }

    if (status === "completed" && countsAsAttended(item, status)) {
      attendedCompleted += 1;
      creditsDelivered += item.creditCost || 1;
      grossDeliveredUsd += price;

      taughtSessions.add(`${item.teacherName}::${item.id}`);

      const bucket = teacherStats.get(item.teacherName) ?? {
        sessions: new Set<string>(),
        grossUsd: 0,
        payoutUsd: 0,
      };
      bucket.sessions.add(item.id);
      bucket.grossUsd += price;
      bucket.payoutUsd += price * TEACHER_PAYOUT_SHARE;
      teacherStats.set(item.teacherName, bucket);
    }
  }

  const billable = items.filter((item) => {
    const status = getClassStatus(item, nowIso);
    return !isCreditRefunded(item, status);
  }).length;

  const typeTotal = oneOnOne + paired || 1;
  const teacherPayoutUsd = grossDeliveredUsd * TEACHER_PAYOUT_SHARE;

  const teachers: TeacherEarningsRow[] = [...teacherStats.entries()]
    .map(([teacherName, stats]) => ({
      teacherName,
      classesTaught: stats.sessions.size,
      grossUsd: stats.grossUsd,
      payoutUsd: stats.payoutUsd,
    }))
    .sort((a, b) => b.payoutUsd - a.payoutUsd);

  const classesTaught = taughtSessions.size;
  const attendanceRatePct =
    completed === 0 ? 0 : Math.round((attendedCompleted / completed) * 100);

  return {
    nowIso,
    totalBookings: billable,
    upcoming,
    inProgress,
    completed,
    canceled,
    classesTaught,
    classesThisWeek,
    attendedCompleted,
    attendanceRatePct,
    creditsBooked,
    creditsDelivered,
    grossDeliveredUsd,
    teacherPayoutUsd,
    academyMarginUsd: grossDeliveredUsd - teacherPayoutUsd,
    pipelineRevenueUsd,
    oneOnOneSharePct: Math.round((oneOnOne / typeTotal) * 100),
    pairedSharePct: Math.round((paired / typeTotal) * 100),
    teachers,
  };
}

export function economicsToAdminStats(
  snapshot: AcademyEconomicsSnapshot,
  t: AdminTranslator,
  locale: string,
): AdminStat[] {
  return [
    {
      id: "taught",
      label: t("adminStat.taught.label"),
      value: formatInt(snapshot.classesTaught, locale),
      helper: t("adminStat.taught.helper", {
        completed: formatInt(snapshot.completed, locale),
        attended: snapshot.attendanceRatePct,
      }),
      href: "/admin/finance/ledger",
    },
    {
      id: "revenue",
      label: t("adminStat.revenue.label"),
      value: formatUsd(snapshot.grossDeliveredUsd, locale),
      helper: t("adminStat.revenue.helper", {
        pipeline: formatUsd(snapshot.pipelineRevenueUsd, locale),
      }),
      href: "/admin/finance/ledger",
    },
    {
      id: "payouts",
      label: t("adminStat.payouts.label"),
      value: formatUsd(snapshot.teacherPayoutUsd, locale),
      helper: t("adminStat.payouts.helper", {
        share: Math.round(TEACHER_PAYOUT_SHARE * 100),
      }),
      href: "/admin/finance/payouts",
    },
    {
      id: "margin",
      label: t("adminStat.margin.label"),
      value: formatUsd(snapshot.academyMarginUsd, locale),
      helper: t("adminStat.margin.helper"),
      href: "/admin/finance/ledger",
    },
  ];
}

export function economicsToManagerStats(
  snapshot: AcademyEconomicsSnapshot,
  activeStudents: number,
  teacherCount: number,
  t: AdminTranslator,
  locale: string,
): ManagerDashboardStat[] {
  const utilization =
    teacherCount === 0
      ? 0
      : Math.min(
          100,
          Math.round((snapshot.classesThisWeek / (teacherCount * 8)) * 100),
        );

  return [
    {
      id: "students",
      label: t("managerStat.students.label"),
      value: formatInt(activeStudents, locale),
      helper: t("managerStat.students.helper"),
    },
    {
      id: "classes",
      label: t("managerStat.classes.label"),
      value: formatInt(snapshot.classesThisWeek, locale),
      helper: t("managerStat.classes.helper", { attended: snapshot.attendanceRatePct }),
    },
    {
      id: "revenue",
      label: t("managerStat.revenue.label"),
      value: formatUsd(snapshot.grossDeliveredUsd, locale),
      helper: t("managerStat.revenue.helper", {
        pipeline: formatUsd(snapshot.pipelineRevenueUsd, locale),
      }),
    },
    {
      id: "utilization",
      label: t("managerStat.utilization.label"),
      value: `${utilization}%`,
      helper: t("managerStat.utilization.helper", {
        classes: formatInt(snapshot.classesThisWeek, locale),
        teachers: teacherCount || 0,
      }),
    },
  ];
}

export function economicsToLedgerSnapshots(
  snapshot: AcademyEconomicsSnapshot,
  t: AdminTranslator,
  locale: string,
): LedgerSnapshot[] {
  return [
    {
      id: "delivered",
      label: t("ledgerSnapshot.delivered.label"),
      value: formatInt(snapshot.classesTaught, locale),
      trend: t("ledgerSnapshot.delivered.trend", {
        credits: formatInt(snapshot.creditsDelivered, locale),
      }),
    },
    {
      id: "gross",
      label: t("ledgerSnapshot.gross.label"),
      value: formatUsd(snapshot.grossDeliveredUsd, locale),
      trend: t("ledgerSnapshot.gross.trend"),
    },
    {
      id: "payouts",
      label: t("ledgerSnapshot.payouts.label"),
      value: formatUsd(snapshot.teacherPayoutUsd, locale),
      trend: t("ledgerSnapshot.payouts.trend", { teachers: snapshot.teachers.length }),
    },
    {
      id: "pipeline",
      label: t("ledgerSnapshot.pipeline.label"),
      value: formatUsd(snapshot.pipelineRevenueUsd, locale),
      trend: t("ledgerSnapshot.pipeline.trend", {
        count: formatInt(snapshot.upcoming + snapshot.inProgress, locale),
      }),
    },
    {
      id: "booked",
      label: t("ledgerSnapshot.booked.label"),
      value: formatInt(snapshot.creditsBooked, locale),
      trend: t("ledgerSnapshot.booked.trend", {
        count: formatInt(snapshot.canceled, locale),
      }),
    },
    {
      id: "margin",
      label: t("ledgerSnapshot.margin.label"),
      value: formatUsd(snapshot.academyMarginUsd, locale),
      trend: t("ledgerSnapshot.margin.trend"),
    },
  ];
}

export function economicsToPayoutBatches(
  snapshot: AcademyEconomicsSnapshot,
  t: AdminTranslator,
  locale: string,
): PayoutBatch[] {
  if (snapshot.teacherPayoutUsd <= 0) {
    return [];
  }

  const periodEnd = new Date(snapshot.nowIso).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return [
    {
      id: "batch-demo-est",
      period: t("payoutBatch.period", { date: periodEnd }),
      manager: t("payoutBatch.manager"),
      totalUsd: formatUsd(snapshot.teacherPayoutUsd, locale),
      teachers: snapshot.teachers.filter((row) => row.payoutUsd > 0).length,
      status: "awaiting-approval",
    },
  ];
}