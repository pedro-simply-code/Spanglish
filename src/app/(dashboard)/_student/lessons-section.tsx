import { getLocale } from "next-intl/server";
import { LessonsOverview } from "@/features/lessons";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { listLessonHistory } from "@/server/learning/insights";

export async function LessonsSection() {
  const actor = await requireDashboard("student");
  const [lessons, profile] = await Promise.all([
    listLessonHistory(actor.userId, (await getLocale()) === "es" ? "es" : "en"),
    getUserProfile(actor.userId),
  ]);
  return <LessonsOverview lessons={lessons} timeZone={resolveTimeZone(profile?.timezone)} />;
}
