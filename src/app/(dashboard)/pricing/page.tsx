import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { BuySection } from "@/app/(dashboard)/_student/buy-section";
import { getActor } from "@/server/auth/session";

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

/** Students buy from "Mis créditos"; staff keep this page to preview the catalog. */
async function PricingContent() {
  const actor = await getActor();
  if (actor.activeRole === "student") redirect("/credits?tab=buy");
  return <BuySection />;
}
