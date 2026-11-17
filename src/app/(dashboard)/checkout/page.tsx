import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { CheckoutOverview } from "@/features/academy";
import { getCheckoutStripeUi } from "@/server/payments/provider-settings";
import { listPublishedAcademyPlans } from "@/server/pricing/packages";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your Spanglish class package",
};

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
