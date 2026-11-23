import { ProgressOverview } from "@/features/progress";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getStudentInsights } from "@/server/learning/insights";

export async function ProgressSection() {
  const actor = await requireDashboard("student");
  const profile = await getUserProfile(actor.userId);
  const timeZone = resolveTimeZone(profile?.timezone);
  const insights = await getStudentInsights(actor.userId, timeZone);
  return <ProgressOverview insights={insights} timeZone={timeZone} />;
}
