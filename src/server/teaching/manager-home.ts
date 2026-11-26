import { and, asc, desc, eq, gt, gte, inArray, lt, lte, ne, sql } from "drizzle-orm";
import { connection } from "next/server";
import type {
  ManagerHome,
  ManagerPendingItem,
  ManagerStudentsSummary,
  ManagerTeamRow,
  ManagerTodayClass,
} from "@/features/staff";
import { appNowDate } from "@/lib/app-clock";
import { teacherLevelFor } from "@/lib/teacher-levels";
import { rowsOf } from "@/server/credits/credits";
import { db } from "@/server/db";
import {
  assignments,
  assignmentSubmissions,
  classChangeRequests,
  classParticipants,
  classRatings,
  classSessions,
  orders,
  teacherEarnings,
  users,
} from "@/server/db/schema";
import { listTeachers } from "@/server/classes/teachers";
import { countPendingApplications } from "@/server/teaching/applications";
import { accrueEarnings, getFinanceSummary, startOfMonth } from "@/server/teaching/earnings";
import { countPendingMaterials } from "@/server/materials/library";
import { getTeacherStats } from "@/server/teaching/stats";

/*
 * The coordinator's home: today's classes (and rooms nobody opened), one
 * to-do list ordered by urgency, the team with what each teacher needs, the
 * students who need a nudge and this month's money. Same criteria as the
 * teacher's home: "to grade" = submitted and not graded; quiet = nothing
 * booked and no class in 14 days.
 */

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** A live class whose room is still closed after this long is flagged. */
const NOT_OPENED_AFTER = 5 * MINUTE;
const QUIET_DAYS = 14;
const LATE_GRADING_DAYS = 3;
const LOW_RATING = 3;

/** YYYY-MM-DD of a moment in a time zone. */
function dayIn(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

/** Monday..Sunday (as YYYY-MM-DD) of the week containing `now` in a time zone. */
function weekIn(now: Date, timeZone: string) {
  const today = dayIn(now, timeZone);
  const weekday = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short" }).format(now);
  const offset = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(weekday);
  const [year, month, day] = today.split("-").map(Number) as [number, number, number];
  const monday = new Date(Date.UTC(year, month - 1, day - Math.max(0, offset)));
  const sunday = new Date(monday.getTime() + 6 * DAY);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10), today };
}

export async function getManagerHome(timeZone: string): Promise<ManagerHome> {
  await connection();
  await accrueEarnings();
  const now = appNowDate();
  const week = weekIn(now, timeZone);
  const monthStart = startOfMonth(now);
  const lastMonthStart = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1));

  const [
    teachers,
    nearbyClasses,
    applications,
    materialsToReview,
    lowRatings,
    toGradeRows,
    changeRequests,
    unbatched,
    finance,
    revenueRows,
    upcomingRows,
    students,
  ] = await Promise.all([
    listTeachers(),
    // Two weeks around today: enough for "today", "live now" and "this week".
    db
      .select({
        id: classSessions.id,
        topic: classSessions.topic,
        teacherName: users.name,
        startsAt: classSessions.startsAt,
        endsAt: classSessions.endsAt,
        liveStartedAt: classSessions.liveStartedAt,
      })
      .from(classSessions)
      .innerJoin(users, eq(users.id, classSessions.teacherId))
      .where(
        and(
          ne(classSessions.status, "canceled"),
          gte(classSessions.startsAt, new Date(now.getTime() - 8 * DAY)),
          lt(classSessions.startsAt, new Date(now.getTime() + 8 * DAY)),
        ),
      )
      .orderBy(asc(classSessions.startsAt))
      .limit(3000),
    countPendingApplications(),
    countPendingMaterials(),
    db
      .select({
        sessionId: classRatings.sessionId,
        stars: classRatings.stars,
        comment: classRatings.comment,
        teacherId: classRatings.teacherId,
        teacherName: sql<string>`(select name from users where id = ${classRatings.teacherId})`,
        studentName: users.name,
      })
      .from(classRatings)
      .innerJoin(users, eq(users.id, classRatings.studentId))
      .where(and(lte(classRatings.stars, LOW_RATING), gte(classRatings.createdAt, new Date(now.getTime() - 14 * DAY))))
      .orderBy(desc(classRatings.createdAt))
      .limit(10),
    db
      .select({
        teacherId: assignments.teacherId,
        total: sql<number>`count(*)::int`,
        late: sql<number>`(count(*) filter (where ${assignmentSubmissions.submittedAt} < ${new Date(now.getTime() - LATE_GRADING_DAYS * DAY)}))::int`,
      })
      .from(assignmentSubmissions)
      .innerJoin(assignments, eq(assignments.id, assignmentSubmissions.assignmentId))
      .where(eq(assignmentSubmissions.status, "submitted"))
      .groupBy(assignments.teacherId),
    db
      .select({
        id: classChangeRequests.id,
        sessionId: classChangeRequests.sessionId,
        newStartsAt: classChangeRequests.newStartsAt,
        topic: classSessions.topic,
      })
      .from(classChangeRequests)
      .innerJoin(classSessions, eq(classSessions.id, classChangeRequests.sessionId))
      .where(and(eq(classChangeRequests.status, "pending"), gt(classChangeRequests.expiresAt, now)))
      .orderBy(asc(classChangeRequests.expiresAt))
      .limit(3),
    db
      .select({
        teachers: sql<number>`count(distinct ${teacherEarnings.teacherId})::int`,
        cents: sql<number>`coalesce(sum(${teacherEarnings.amountCents}),0)::int`,
      })
      .from(teacherEarnings)
      .where(sql`${teacherEarnings.payoutBatchId} is null`),
    getFinanceSummary(),
    db
      .select({
        thisMonth: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.createdAt} >= ${monthStart}),0)::int`,
        lastMonth: sql<number>`coalesce(sum(${orders.totalCents}) filter (where ${orders.createdAt} >= ${lastMonthStart} and ${orders.createdAt} < ${monthStart}),0)::int`,
        ordersThisMonth: sql<number>`(count(*) filter (where ${orders.createdAt} >= ${monthStart}))::int`,
      })
      .from(orders)
      .where(eq(orders.status, "paid")),
    db
      .select({ teacherId: classSessions.teacherId, count: sql<number>`count(*)::int` })
      .from(classSessions)
      .where(and(eq(classSessions.status, "scheduled"), gt(classSessions.startsAt, now)))
      .groupBy(classSessions.teacherId),
    studentsSummary(now),
  ]);

  /* --- Today and this week --- */
  const todayRows = nearbyClasses.filter((row) => {
    const live = row.startsAt <= now && row.endsAt > now;
    return live || dayIn(row.startsAt, timeZone) === week.today;
  });
  const participants = todayRows.length
    ? await db
        .select({ sessionId: classParticipants.sessionId, name: users.name })
        .from(classParticipants)
        .innerJoin(users, eq(users.id, classParticipants.userId))
        .where(
          inArray(
            classParticipants.sessionId,
            todayRows.map((row) => row.id),
          ),
        )
    : [];
  const today: ManagerTodayClass[] = todayRows.map((row) => {
    const live = row.startsAt <= now && row.endsAt > now;
    return {
      id: row.id,
      topic: row.topic,
      teacherName: row.teacherName,
      students: participants.filter((person) => person.sessionId === row.id).map((person) => person.name),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      live,
      notOpened: live && !row.liveStartedAt && now.getTime() - row.startsAt.getTime() > NOT_OPENED_AFTER,
    };
  });
  const classesThisWeek = nearbyClasses.filter((row) => {
    const day = dayIn(row.startsAt, timeZone);
    return day >= week.from && day <= week.to;
  }).length;

  /* --- Team --- */
  const stats = await getTeacherStats(teachers.map((teacher) => teacher.id));
  const upcomingBy = new Map(upcomingRows.map((row) => [row.teacherId, Number(row.count)]));
  const gradingBy = new Map(toGradeRows.map((row) => [row.teacherId, row]));
  const lowRatedTeachers = new Set(lowRatings.map((row) => row.teacherId));
  const team: ManagerTeamRow[] = teachers
    .map((teacher) => {
      const row = stats.get(teacher.id)!;
      const upcoming = upcomingBy.get(teacher.id) ?? 0;
      const toGrade = Number(gradingBy.get(teacher.id)?.total ?? 0);
      const flags: ManagerTeamRow["flags"] = [];
      if (!teacher.hasAvailability) flags.push("noAvailability");
      if (!upcoming) flags.push("noUpcoming");
      if (toGrade) flags.push("toGrade");
      if (lowRatedTeachers.has(teacher.id)) flags.push("lowRating");
      return {
        id: teacher.id,
        name: teacher.name,
        image: teacher.image,
        headline: teacher.headline,
        levelName: teacherLevelFor(row).name,
        classesTaught: row.classesTaught,
        ratingAverage: row.ratingAverage,
        ratingCount: row.ratingCount,
        upcoming,
        toGrade,
        flags,
      };
    })
    // Who needs attention first, then the busiest.
    .sort((a, b) => b.flags.length - a.flags.length || b.classesTaught - a.classesTaught);

  /* --- To-do, most urgent first --- */
  const pending: ManagerPendingItem[] = [];
  for (const item of today.filter((row) => row.notOpened)) {
    pending.push({
      kind: "notOpened",
      id: `open-${item.id}`,
      href: `/classes/${item.id}`,
      severity: "high",
      topic: item.topic,
      teacherName: item.teacherName,
      minutes: Math.floor((now.getTime() - new Date(item.startsAt).getTime()) / MINUTE),
    });
  }
  if (applications) {
    pending.push({ kind: "applications", id: "applications", href: "/manager/applications", severity: "high", count: applications });
  }
  if (materialsToReview) {
    pending.push({ kind: "materials", id: "materials", href: "/manager/materials", severity: "normal", count: materialsToReview });
  }
  for (const rating of lowRatings.slice(0, 3)) {
    pending.push({
      kind: "lowRating",
      id: `rating-${rating.sessionId}-${rating.studentName}`,
      href: `/classes/${rating.sessionId}`,
      severity: "normal",
      stars: rating.stars,
      teacherName: rating.teacherName,
      studentName: rating.studentName,
      comment: rating.comment,
    });
  }
  for (const row of toGradeRows.filter((item) => Number(item.late) > 0)) {
    const teacher = teachers.find((item) => item.id === row.teacherId);
    if (!teacher) continue;
    pending.push({
      kind: "lateGrading",
      id: `grading-${row.teacherId}`,
      href: "/manager/staff",
      severity: "normal",
      teacherName: teacher.name,
      count: Number(row.late),
    });
  }
  const unbatchedRow = unbatched[0];
  if (Number(unbatchedRow?.cents ?? 0) > 0) {
    pending.push({
      kind: "payouts",
      id: "payouts",
      href: "/manager/payouts",
      severity: "normal",
      amountCents: Number(unbatchedRow!.cents),
      teachers: Number(unbatchedRow!.teachers),
    });
  }
  for (const request of changeRequests) {
    pending.push({
      kind: "changeRequest",
      id: `change-${request.id}`,
      href: `/classes/${request.sessionId}`,
      severity: "low",
      topic: request.topic,
      newStartsAt: request.newStartsAt.toISOString(),
    });
  }
  const withoutAvailability = teachers.filter((teacher) => !teacher.hasAvailability).length;
  if (withoutAvailability) {
    pending.push({ kind: "noAvailability", id: "availability", href: "/manager/staff", severity: "low", count: withoutAvailability });
  }
  if (students.idleWithCredits) {
    pending.push({ kind: "quietStudents", id: "quiet", href: "/manager/students", severity: "low", count: students.idleWithCredits });
  }

  const revenue = revenueRows[0];
  return {
    today,
    classesThisWeek,
    pending,
    team: team.slice(0, 8),
    teacherCount: teachers.length,
    students,
    money: {
      revenueThisMonthCents: Number(revenue?.thisMonth ?? 0),
      revenueLastMonthCents: Number(revenue?.lastMonth ?? 0),
      ordersThisMonth: Number(revenue?.ordersThisMonth ?? 0),
      creditsOutstanding: finance.creditsOutstanding,
      teacherEarnedThisMonthCents: finance.teacherEarnedThisMonthCents,
      teacherUnbatchedCents: Number(unbatchedRow?.cents ?? 0),
      unbatchedTeachers: Number(unbatchedRow?.teachers ?? 0),
    },
  };
}

/** Student counts in one query. Staff accounts that also learn are left out. */
export async function studentsSummary(now: Date): Promise<ManagerStudentsSummary> {
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const monthAgo = new Date(now.getTime() - 30 * DAY);
  const quietSince = new Date(now.getTime() - QUIET_DAYS * DAY);
  const result = await db.execute(sql`
    WITH students AS (
      SELECT id, created_at FROM users
      WHERE 'student' = ANY(roles) AND NOT (roles && ARRAY['teacher','manager','admin']::text[])
        AND email NOT LIKE '%@deleted.invalid'
    ),
    balances AS (
      SELECT s.id, coalesce(sum(ca.balance), 0)::int AS balance
      FROM students s
      LEFT JOIN credit_accounts ca ON ca.holder = 'user:' || s.id
        OR ca.holder IN (
          SELECT 'pair:' || p.id FROM student_pairs p
          WHERE p.active AND (p.student_a_id = s.id OR p.student_b_id = s.id)
        )
      GROUP BY s.id
    ),
    classes AS (
      SELECT cp.user_id AS id,
        max(cs.starts_at) FILTER (WHERE cs.starts_at <= ${now}) AS last_class,
        bool_or(cs.starts_at > ${now}) AS has_next,
        bool_or(cs.billing_kind = 'trial' AND cs.ends_at <= ${now}) AS had_trial,
        bool_or(cs.starts_at >= ${monthAgo} AND cs.starts_at <= ${now}) AS active
      FROM class_participants cp
      JOIN class_sessions cs ON cs.id = cp.session_id
      WHERE cs.status <> 'canceled'
      GROUP BY cp.user_id
    ),
    bought AS (
      SELECT buyer_user_id AS id, count(*)::int AS paid FROM orders WHERE status = 'paid' GROUP BY buyer_user_id
    )
    SELECT
      count(*)::int AS total,
      (count(*) FILTER (WHERE s.created_at >= ${weekAgo}))::int AS new_week,
      (count(*) FILTER (WHERE c.active))::int AS active30,
      (count(*) FILTER (
        WHERE b.balance = 0 AND NOT coalesce(c.has_next, false)
          AND (c.last_class IS NOT NULL OR coalesce(o.paid, 0) > 0)
      ))::int AS out_of_credits,
      (count(*) FILTER (
        WHERE b.balance > 0 AND NOT coalesce(c.has_next, false)
          AND (c.last_class IS NULL OR c.last_class < ${quietSince})
      ))::int AS idle,
      (count(*) FILTER (WHERE c.had_trial AND coalesce(o.paid, 0) = 0))::int AS trials
    FROM students s
    JOIN balances b ON b.id = s.id
    LEFT JOIN classes c ON c.id = s.id
    LEFT JOIN bought o ON o.id = s.id
  `);
  const row = rowsOf<Record<string, number | string>>(result)[0] ?? {};
  const n = (key: string) => Number(row[key] ?? 0);
  return {
    total: n("total"),
    newThisWeek: n("new_week"),
    active30: n("active30"),
    outOfCredits: n("out_of_credits"),
    idleWithCredits: n("idle"),
    trialsNoPurchase: n("trials"),
  };
}
