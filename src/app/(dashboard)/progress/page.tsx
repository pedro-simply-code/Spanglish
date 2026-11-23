import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { StudentHubPage, pickTab } from "@/app/(dashboard)/_student/hub";
import { AchievementsSection } from "@/app/(dashboard)/_student/achievements-section";
import { ProgressSection } from "@/app/(dashboard)/_student/progress-section";
import { requireDashboard } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.hub.progress");
  return { title: t("title"), description: t("subtitle") };
}

type PageProps = { searchParams: Promise<{ tab?: string | string[] }> };

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <HubContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HubContent({ searchParams }: PageProps) {
  const [, query] = await Promise.all([requireDashboard("student"), searchParams]);
  const tab = pickTab("progress", query.tab);
  return (
    <StudentHubPage hub="progress" active={tab}>
      {tab === "progress" ? <ProgressSection /> : <AchievementsSection />}
    </StudentHubPage>
  );
}
