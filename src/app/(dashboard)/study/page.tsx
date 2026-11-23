import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { StudentHubPage, pickTab } from "@/app/(dashboard)/_student/hub";
import { MaterialsSection } from "@/app/(dashboard)/_student/materials-section";
import { PracticeSection } from "@/app/(dashboard)/_student/practice-section";
import { VocabularySection } from "@/app/(dashboard)/_student/vocabulary-section";
import { requireDashboard } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.hub.study");
  return { title: t("title"), description: t("subtitle") };
}

type PageProps = { searchParams: Promise<{ tab?: string | string[]; c?: string | string[] }> };

export default function Page({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <HubContent searchParams={searchParams} />
    </Suspense>
  );
}

async function HubContent({ searchParams }: PageProps) {
  const [, query] = await Promise.all([requireDashboard("student"), searchParams]);
  // The AI practice moved to its own pages (old links keep working).
  if (query.tab === "ai") redirect(typeof query.c === "string" ? `/chat?c=${query.c}` : "/chat");
  const tab = pickTab("study", query.tab);
  return (
    <StudentHubPage hub="study" active={tab}>
      {tab === "practice" ? <PracticeSection /> : null}
      {tab === "vocabulary" ? <VocabularySection /> : null}
      {tab === "materials" ? <MaterialsSection /> : null}
    </StudentHubPage>
  );
}
