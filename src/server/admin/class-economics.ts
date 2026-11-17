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
import { listPricingPackageRows } from "@/server/pricing/packages";

/** Share of student price paid to teachers for delivered classes (until earnings table exists). */
const TEACHER_PAYOUT_SHARE = 0.55;

export type { AcademyEconomicsSnapshot, ManagerDashboardStat, TeacherEarningsRow };

function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatInt(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
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

export function economicsToAdminStats(snapshot: AcademyEconomicsSnapshot): AdminStat[] {
  return [
    {
      id: "taught",
      label: "Classes delivered",
      value: formatInt(snapshot.classesTaught),
      helper: `${formatInt(snapshot.completed)} completed · ${snapshot.attendanceRatePct}% marked attended`,
      href: "/admin/finance/ledger",
    },
    {
      id: "revenue",
      label: "Gross revenue (delivered)",
      value: formatUsd(snapshot.grossDeliveredUsd),
      helper: `${formatUsd(snapshot.pipelineRevenueUsd)} booked in upcoming / in progress`,
      href: "/admin/finance/ledger",
    },
    {
      id: "payouts",
      label: "Teacher payouts (est.)",
      value: formatUsd(snapshot.teacherPayoutUsd),
      helper: `${Math.round(TEACHER_PAYOUT_SHARE * 100)}% of delivered tuition · unsettled`,
      href: "/admin/finance/payouts",
    },
    {
      id: "margin",
      label: "Academy margin (est.)",
      value: formatUsd(snapshot.academyMarginUsd),
      helper: "Delivered revenue minus teacher share",
      href: "/admin/finance/ledger",
    },
  ];
}

export function economicsToManagerStats(
  snapshot: AcademyEconomicsSnapshot,
  activeStudents: number,
  teacherCount: number,
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
      label: "Active students",
      value: formatInt(activeStudents),
      helper: "Accounts with student role",
    },
    {
      id: "classes",
      label: "Classes this week",
      value: formatInt(snapshot.classesThisWeek),
      helper: `${snapshot.attendanceRatePct}% attended (completed)`,
    },
    {
      id: "revenue",
      label: "Revenue delivered",
      value: formatUsd(snapshot.grossDeliveredUsd),
      helper: `${formatUsd(snapshot.pipelineRevenueUsd)} in the pipeline`,
    },
    {
      id: "utilization",
      label: "Teacher utilization",
      value: `${utilization}%`,
      helper: `${formatInt(snapshot.classesThisWeek)} classes / ${teacherCount || 0} teachers`,
    },
  ];
}

export function economicsToLedgerSnapshots(
  snapshot: AcademyEconomicsSnapshot,
): LedgerSnapshot[] {
  return [
    {
      id: "delivered",
      label: "Classes delivered",
      value: formatInt(snapshot.classesTaught),
      trend: `${formatInt(snapshot.creditsDelivered)} credits consumed`,
    },
    {
      id: "gross",
      label: "Gross revenue (delivered)",
      value: formatUsd(snapshot.grossDeliveredUsd),
      trend: "From catalog price × booked credits",
    },
    {
      id: "payouts",
      label: "Teacher earnings (unsettled)",
      value: formatUsd(snapshot.teacherPayoutUsd),
      trend: `${snapshot.teachers.length} teachers with delivered classes`,
    },
    {
      id: "pipeline",
      label: "Pipeline (not delivered)",
      value: formatUsd(snapshot.pipelineRevenueUsd),
      trend: `${formatInt(snapshot.upcoming + snapshot.inProgress)} upcoming or live`,
    },
    {
      id: "booked",
      label: "Credits booked",
      value: formatInt(snapshot.creditsBooked),
      trend: `${formatInt(snapshot.canceled)} canceled (incl. refunds)`,
    },
    {
      id: "margin",
      label: "Academy margin (est.)",
      value: formatUsd(snapshot.academyMarginUsd),
      trend: "Delivered revenue − teacher share",
    },
  ];
}

export function economicsToPayoutBatches(
  snapshot: AcademyEconomicsSnapshot,
): PayoutBatch[] {
  if (snapshot.teacherPayoutUsd <= 0) {
    return [];
  }

  const periodEnd = new Date(snapshot.nowIso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return [
    {
      id: "batch-demo-est",
      period: `Through ${periodEnd}`,
      manager: "Estimated from live_classes",
      totalUsd: formatUsd(snapshot.teacherPayoutUsd),
      teachers: snapshot.teachers.filter((row) => row.payoutUsd > 0).length,
      status: "awaiting-approval",
    },
  ];
}