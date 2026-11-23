import { AchievementsOverview } from "@/features/achievements";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getStudentInsights } from "@/server/learning/insights";

export async function AchievementsSection() {
  const actor = await requireDashboard("student");
  const profile = await getUserProfile(actor.userId);
  const timeZone = resolveTimeZone(profile?.timezone);
  const insights = await getStudentInsights(actor.userId, timeZone);
  return <AchievementsOverview achievements={insights.achievements} timeZone={timeZone} />;
}
