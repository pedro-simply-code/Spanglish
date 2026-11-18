import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { CheckoutOverview } from "@/features/academy";
import { getCheckoutStripeUi } from "@/server/payments/provider-settings";
import { listPublishedAcademyPlans } from "@/server/pricing/packages";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.checkout.title"),
    description: t("meta.checkout.description"),
  };
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <CheckoutContent />
    </Suspense>
  );
}

async function CheckoutContent() {
  const [plans, stripe] = await Promise.all([listPublishedAcademyPlans(), getCheckoutStripeUi()]);
  return <CheckoutOverview plans={plans} stripe={stripe} />;
}
