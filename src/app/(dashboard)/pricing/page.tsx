import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { PricingOverview } from "@/features/academy";
import { listPublishedAcademyPlans } from "@/server/pricing/packages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.pricing.title"),
    description: t("meta.pricing.description"),
  };
}

export default function PricingPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <PricingContent />
    </Suspense>
  );
}

async function PricingContent() {
  const plans = await listPublishedAcademyPlans();
  return <PricingOverview plans={plans} />;
}
