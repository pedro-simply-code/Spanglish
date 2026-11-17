import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { PricingOverview } from "@/features/academy";
import { listPublishedAcademyPlans } from "@/server/pricing/packages";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Live Spanish classes and class packages",
};

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
