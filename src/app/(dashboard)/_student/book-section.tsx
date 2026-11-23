import { appNowDate } from "@/lib/app-clock";
import { ScheduleOverview } from "@/features/academy";
import { loadClassesForActor } from "@/features/classes";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getActivePairForUser } from "@/server/classes/pairs";
import { listTeachers } from "@/server/classes/teachers";
import { listBalancesForStudent } from "@/server/credits/credits";
import { studentTrialLessonAvailable } from "@/server/classes/booking";
import { emptyTeacherStats, teacherLevelFor } from "@/lib/teacher-levels";
import { getTeacherStats } from "@/server/teaching/stats";

export async function BookSection() {
  const actor = await requireDashboard("student");
  const [teachers, balances, pair, profile, classes, trialEligible] = await Promise.all([
    listTeachers({ bookableOnly: true }),
    listBalancesForStudent(actor.userId),
    getActivePairForUser(actor.userId),
    getUserProfile(actor.userId),
    loadClassesForActor(actor),
    studentTrialLessonAvailable(actor.userId),
  ]);

  const stats = await getTeacherStats(teachers.map((teacher) => teacher.id));
  const now = appNowDate().getTime();
  const upcoming = classes
    .filter((item) => !item.statusOverride && new Date(item.startsAt).getTime() > now)
    .slice(0, 4)
    .map((item) => ({
      id: item.id,
      topic: item.topic,
      teacherName: item.teacherName,
      startsAt: item.startsAt,
    }));

  return (
    <ScheduleOverview
      teachers={teachers.map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        image: teacher.image,
        headline: teacher.headline,
        bio: teacher.bio,
        country: teacher.country,
        tags: teacher.tags,
        ratingAverage: stats.get(teacher.id)?.ratingAverage ?? 0,
        ratingCount: stats.get(teacher.id)?.ratingCount ?? 0,
        levelName: teacherLevelFor(stats.get(teacher.id) ?? emptyTeacherStats).name,
      }))}
      balances={balances
        .filter((item) => item.classType === "one-on-one" || pair)
        .map((item) => ({
          classType: item.classType,
          durationMinutes: item.durationMinutes,
          balance: item.balance,
          shared: item.shared,
        }))}
      partnerName={pair?.partnerName ?? null}
      timeZone={resolveTimeZone(profile?.timezone)}
      upcoming={upcoming}
      trialEligible={trialEligible}
    />
  );
}
