import { emptyTeacherStats, teacherBadges, teacherLevelFor } from "@/lib/teacher-levels";
import { listTeachers } from "@/server/classes/teachers";
import { getTeacherStats } from "@/server/teaching/stats";
import { json, requireApiActor } from "@/server/api/http";

/** GET /api/v1/teachers — teachers students can book. */
export async function GET() {
  const guard = await requireApiActor({ permission: "classes:book" });
  if (guard.response) return guard.response;

  const teachers = await listTeachers({ bookableOnly: true });
  const stats = await getTeacherStats(teachers.map((teacher) => teacher.id));
  return json({
    teachers: teachers.map(({ id, name, image, headline, bio, country, tags, timeZone }) => {
      const teacherStats = stats.get(id) ?? emptyTeacherStats;
      return {
        id,
        name,
        image,
        headline,
        bio,
        country,
        tags,
        timeZone,
        rating: { average: teacherStats.ratingAverage, count: teacherStats.ratingCount },
        level: teacherLevelFor(teacherStats).name,
        badges: teacherBadges(teacherStats).map((badge) => badge.label),
      };
    }),
  });
}
