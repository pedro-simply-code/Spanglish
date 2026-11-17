import { requestTime } from "@/server/request-time";
import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { emptyTeacherStats, type TeacherStats } from "@/lib/teacher-levels";
import { db } from "@/server/db";
import { classRatings, classSessions } from "@/server/db/schema";

/** Classes taught (delivered, not canceled) and ratings per teacher. */
export async function getTeacherStats(teacherIds: string[]): Promise<Map<string, TeacherStats>> {
  await requestTime(); // reads the clock
  const result = new Map<string, TeacherStats>();
  if (!teacherIds.length) return result;

  const [taught, ratings] = await Promise.all([
    db
      .select({
        teacherId: classSessions.teacherId,
        classes: sql<number>`count(*)::int`,
        paired: sql<number>`count(*) filter (where ${classSessions.classType} = 'paired')::int`,
      })
      .from(classSessions)
      .where(
        and(
          inArray(classSessions.teacherId, teacherIds),
          eq(classSessions.status, "scheduled"),
          lt(classSessions.endsAt, new Date()),
        ),
      )
      .groupBy(classSessions.teacherId),
    db
      .select({
        teacherId: classRatings.teacherId,
        count: sql<number>`count(*)::int`,
        average: sql<number>`coalesce(avg(${classRatings.stars}), 0)::float`,
        five: sql<number>`count(*) filter (where ${classRatings.stars} = 5)::int`,
      })
      .from(classRatings)
      .where(inArray(classRatings.teacherId, teacherIds))
      .groupBy(classRatings.teacherId),
  ]);

  for (const id of teacherIds) result.set(id, { ...emptyTeacherStats });
  for (const row of taught) {
    const stats = result.get(row.teacherId)!;
    stats.classesTaught = Number(row.classes);
    stats.pairedTaught = Number(row.paired);
  }
  for (const row of ratings) {
    const stats = result.get(row.teacherId)!;
    stats.ratingCount = Number(row.count);
    stats.ratingAverage = Math.round(Number(row.average) * 100) / 100;
    stats.fiveStarCount = Number(row.five);
  }
  return result;
}
