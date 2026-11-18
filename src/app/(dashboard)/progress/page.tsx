import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ProgressOverview } from "@/features/progress";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getStudentInsights } from "@/server/learning/insights";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.progress.title"),
    description: t("meta.progress.description"),
  };
}

export default function ProgressPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ProgressContent />
    </Suspense>
  );
}

async function ProgressContent() {
  const actor = await requireDashboard("student");
  const profile = await getUserProfile(actor.userId);
  const timeZone = resolveTimeZone(profile?.timezone);
  const insights = await getStudentInsights(actor.userId, timeZone);
  return <ProgressOverview insights={insights} timeZone={timeZone} />;
}
