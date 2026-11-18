import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { AchievementsOverview } from "@/features/achievements";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getStudentInsights } from "@/server/learning/insights";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.achievements.title"),
    description: t("meta.achievements.description"),
  };
}

export default function AchievementsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AchievementsContent />
    </Suspense>
  );
}

async function AchievementsContent() {
  const actor = await requireDashboard("student");
  const profile = await getUserProfile(actor.userId);
  const timeZone = resolveTimeZone(profile?.timezone);
  const insights = await getStudentInsights(actor.userId, timeZone);
  return <AchievementsOverview achievements={insights.achievements} timeZone={timeZone} />;
}
