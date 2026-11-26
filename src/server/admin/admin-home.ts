import { and, count, gte, isNotNull, ne, sql } from "drizzle-orm";
import { connection } from "next/server";
import { env } from "@/env";
import type { AdminAlert, AdminHome, AdminHomeDay } from "@/features/admin";
import { appNowDate } from "@/lib/app-clock";
import { rowsOf } from "@/server/credits/credits";
import { db } from "@/server/db";
import { auditLogs, users } from "@/server/db/schema";
import {
  buildIntegrationStatuses,
  formatAuditActivity,
  getPlatformHealthAlerts,
  getRecentAuditForDashboard,
} from "@/server/admin/insights";
import { getPayoutAlerts } from "@/server/teaching/dashboards";
import { accrueEarnings, getFinanceSummary, startOfMonth } from "@/server/teaching/earnings";
import { getManagerHome, studentsSummary } from "@/server/teaching/manager-home";

/*
 * The admin's home: what only the admin can unblock, the business this month
 * (with the real margin: card fees, teacher pay and Claude), 30 days by day,
 * growth, a summary of the coordinator's day and platform health. Days are
 * counted in the admin's time zone; "now" is the app clock.
 */

const DAY = 24 * 60 * 60 * 1000;
const severityRank = { critical: 0, warning: 1, info: 2 } as const;

export async function getAdminHome(timeZone: string): Promise<AdminHome> {
  await connection();
  await accrueEarnings();
  const now = appNowDate();
  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1));
  const since = new Date(now.getTime() - 29 * DAY);
  since.setUTCHours(0, 0, 0, 0);
  const weekAgo = new Date(now.getTime() - 7 * DAY);

  const [
    payoutAlerts,
    platformAlerts,
    integrations,
    finance,
    monthRows,
    dayRows,
    growthRows,
    students,
    coordinator,
    securityRows,
    bouncedRows,
    staffRows,
    recent,
  ] = await Promise.all([
    getPayoutAlerts(),
    getPlatformHealthAlerts(),
    buildIntegrationStatuses(),
    getFinanceSummary(),
    db.execute(sql`
      WITH paid AS (
        SELECT buyer_user_id, total_cents, created_at FROM orders WHERE status = 'paid'
        UNION ALL
        SELECT buyer_user_id, total_cents, created_at FROM ai_credit_orders WHERE status = 'paid'
      ),
      first_paid AS (SELECT buyer_user_id, min(created_at) AS first_at FROM paid GROUP BY buyer_user_id)
      SELECT
        coalesce(sum(total_cents) FILTER (WHERE created_at >= ${monthStart}), 0)::bigint AS this_month,
        coalesce(sum(total_cents) FILTER (WHERE created_at >= ${lastMonthStart} AND created_at < ${monthStart}), 0)::bigint AS last_month,
        (count(*) FILTER (WHERE created_at >= ${monthStart}))::int AS orders_this_month,
        (count(DISTINCT buyer_user_id) FILTER (WHERE created_at >= ${monthStart}))::int AS buyers,
        (SELECT count(*)::int FROM first_paid WHERE first_at >= ${monthStart}) AS first_time,
        (SELECT coalesce(sum(amount_cents), 0)::bigint FROM teacher_earnings WHERE class_ended_at >= ${monthStart}) AS teacher,
        (
          (SELECT coalesce(sum(cost_micros), 0) FROM ai_conversations WHERE created_at >= ${monthStart})
          + (SELECT coalesce(sum(cost_micros), 0) FROM class_summaries WHERE created_at >= ${monthStart})
        )::bigint AS ai_micros
      FROM paid
    `),
    db.execute(sql`
      WITH days AS (
        SELECT to_char(d, 'YYYY-MM-DD') AS day
        FROM generate_series(
          (${now}::timestamptz AT TIME ZONE ${timeZone})::date - 29,
          (${now}::timestamptz AT TIME ZONE ${timeZone})::date,
          interval '1 day'
        ) AS d
      ),
      revenue AS (
        SELECT to_char(created_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day, sum(total_cents) AS cents
        FROM (
          SELECT total_cents, created_at FROM orders WHERE status = 'paid' AND created_at >= ${since}
          UNION ALL
          SELECT total_cents, created_at FROM ai_credit_orders WHERE status = 'paid' AND created_at >= ${since}
        ) o GROUP BY 1
      ),
      teacher AS (
        SELECT to_char(class_ended_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day, sum(amount_cents) AS cents
        FROM teacher_earnings WHERE class_ended_at >= ${since} GROUP BY 1
      ),
      ai AS (
        SELECT to_char(created_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day, sum(cost_micros) AS micros
        FROM (
          SELECT cost_micros, created_at FROM ai_conversations WHERE created_at >= ${since}
          UNION ALL
          SELECT cost_micros, created_at FROM class_summaries WHERE created_at >= ${since}
        ) a GROUP BY 1
      ),
      classes AS (
        SELECT to_char(starts_at AT TIME ZONE ${timeZone}, 'YYYY-MM-DD') AS day,
          count(*) FILTER (WHERE status <> 'canceled') AS held,
          count(*) FILTER (WHERE status = 'canceled') AS canceled
        FROM class_sessions WHERE starts_at >= ${since} AND starts_at <= ${now} GROUP BY 1
      )
      SELECT days.day,
        coalesce(revenue.cents, 0)::bigint AS revenue,
        coalesce(teacher.cents, 0)::bigint AS teacher,
        coalesce(ai.micros, 0)::bigint AS ai_micros,
        coalesce(classes.held, 0)::int AS classes,
        coalesce(classes.canceled, 0)::int AS canceled
      FROM days
      LEFT JOIN revenue ON revenue.day = days.day
      LEFT JOIN teacher ON teacher.day = days.day
      LEFT JOIN ai ON ai.day = days.day
      LEFT JOIN classes ON classes.day = days.day
      ORDER BY days.day
    `),
    db.execute(sql`
      WITH students AS (
        SELECT id, created_at FROM users
        WHERE 'student' = ANY(roles) AND NOT (roles && ARRAY['teacher','manager','admin']::text[])
        AND email NOT LIKE '%@deleted.invalid'
      ),
      trial AS (
        SELECT DISTINCT cp.user_id AS id
        FROM class_participants cp JOIN class_sessions cs ON cs.id = cp.session_id
        WHERE cs.billing_kind = 'trial' AND cs.status <> 'canceled' AND cs.ends_at <= ${now}
      ),
      bought AS (SELECT DISTINCT buyer_user_id AS id FROM orders WHERE status = 'paid')
      SELECT
        (count(*) FILTER (WHERE s.created_at >= ${monthStart}))::int AS new_this_month,
        (count(*) FILTER (WHERE s.created_at >= ${lastMonthStart} AND s.created_at < ${monthStart}))::int AS new_last_month,
        (SELECT count(*)::int FROM trial JOIN students st ON st.id = trial.id) AS trials,
        (SELECT count(*)::int FROM trial JOIN students st ON st.id = trial.id JOIN bought b ON b.id = trial.id) AS trials_converted
      FROM students s
    `),
    studentsSummary(now),
    getManagerHome(timeZone),
    db
      .select({ value: count() })
      .from(auditLogs)
      .where(and(gte(auditLogs.createdAt, weekAgo), ne(auditLogs.severity, "info"))),
    db.select({ value: count() }).from(users).where(isNotNull(users.emailBouncedAt)),
    db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          sql`${users.roles} && ARRAY['manager','admin']::text[]`,
          sql`COALESCE(${users.twoFactorEnabled}, false) = false`,
        ),
      ),
    // Sign-ins drown everything else: the audit log keeps them.
    getRecentAuditForDashboard(100).then((rows) => rows.filter((row) => row.action !== "auth.sign_in").slice(0, 5)),
  ]);

  /* --- Needs your action: payouts first, then platform (integrations live in Health) --- */
  const actions: AdminAlert[] = [
    ...payoutAlerts,
    ...platformAlerts.filter((alert) => !alert.id.startsWith("integration-")),
  ].sort((a, b) => severityRank[a.severity] - severityRank[b.severity]);

  /* --- Business this month --- */
  const month = rowsOf<Record<string, string | number>>(monthRows)[0] ?? {};
  const n = (row: Record<string, string | number>, key: string) => Number(row[key] ?? 0);
  const revenue = n(month, "this_month");
  const orders = n(month, "orders_this_month");
  const feeCents = Math.round(revenue * (env.PAYMENT_FEE_PERCENT / 100) + orders * env.PAYMENT_FEE_FIXED_CENTS);
  const teacherCents = n(month, "teacher");
  const aiCents = Math.round(n(month, "ai_micros") / 10_000);

  const days: AdminHomeDay[] = rowsOf<Record<string, string | number>>(dayRows).map((row) => ({
    date: String(row.day),
    revenueCents: n(row, "revenue"),
    teacherCents: n(row, "teacher"),
    aiCents: Math.round(n(row, "ai_micros") / 10_000),
    classes: n(row, "classes"),
    canceled: n(row, "canceled"),
  }));

  const growth = rowsOf<Record<string, string | number>>(growthRows)[0] ?? {};
  const activity = await Promise.all(recent.map((entry) => formatAuditActivity(entry)));

  return {
    actions,
    business: {
      revenueThisMonthCents: revenue,
      revenueLastMonthCents: n(month, "last_month"),
      marginCents: revenue - feeCents - teacherCents - aiCents,
      feeCents,
      teacherCents,
      aiCents,
      deferredCents: finance.deferredRevenueCents,
      creditsOutstanding: finance.creditsOutstanding,
      payingStudents: n(month, "buyers"),
      firstTimeBuyers: n(month, "first_time"),
    },
    days,
    growth: {
      newThisMonth: n(growth, "new_this_month"),
      newLastMonth: n(growth, "new_last_month"),
      active30: students.active30,
      total: students.total,
      outOfCredits: students.outOfCredits,
      trials: n(growth, "trials"),
      trialsConverted: n(growth, "trials_converted"),
    },
    operations: {
      today: coordinator.today.length,
      live: coordinator.today.filter((item) => item.live).length,
      notOpened: coordinator.today.filter((item) => item.notOpened).length,
      coordinatorPending: coordinator.pending.length,
      coordinatorUrgent: coordinator.pending.filter((item) => item.severity === "high").length,
    },
    health: {
      integrations: integrations.map((item) => ({ id: item.id, name: item.name, status: item.status })),
      securityEvents7d: Number(securityRows[0]?.value ?? 0),
      bouncedEmails: Number(bouncedRows[0]?.value ?? 0),
      staffWithout2Fa: Number(staffRows[0]?.value ?? 0),
    },
    activity,
  };
}
