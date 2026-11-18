import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { LessonsOverview } from "@/features/lessons";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { listLessonHistory } from "@/server/learning/insights";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.lessons.title"),
    description: t("meta.lessons.description"),
  };
}

export default function LessonsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <LessonsContent />
    </Suspense>
  );
}

async function LessonsContent() {
  const actor = await requireDashboard("student");
  const [lessons, profile] = await Promise.all([
    listLessonHistory(actor.userId),
    getUserProfile(actor.userId),
  ]);
  return <LessonsOverview lessons={lessons} timeZone={resolveTimeZone(profile?.timezone)} />;
}
