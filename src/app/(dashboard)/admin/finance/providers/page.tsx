import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { FinanceProvidersOverview } from "@/features/admin";
import { buildPaymentProviders } from "@/server/payments/provider-settings";
import { requestTime } from "@/server/request-time";

export const metadata: Metadata = {
  title: "Payment providers",
  description: "Checkout and payout provider status",
};

export default function AdminFinanceProvidersPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ProvidersContent />
    </Suspense>
  );
}

async function ProvidersContent() {
  await requestTime();
  const { providers, settings } = await buildPaymentProviders();
  return <FinanceProvidersOverview providers={providers} settings={settings} />;
}