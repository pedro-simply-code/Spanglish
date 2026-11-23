import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { StudentHubPage, pickTab } from "@/app/(dashboard)/_student/hub";
import { BuySection } from "@/app/(dashboard)/_student/buy-section";
import { CreditsSection } from "@/app/(dashboard)/_student/credits-section";
import { requireDashboard } from "@/server/auth/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student.hub.credits");
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
  const tab = pickTab("credits", query.tab);
  return (
    <StudentHubPage hub="credits" active={tab}>
      {tab === "credits" ? <CreditsSection /> : <BuySection />}
    </StudentHubPage>
  );
}
