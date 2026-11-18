import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { FinanceProvidersOverview } from "@/features/admin";
import { buildPaymentProviders } from "@/server/payments/provider-settings";
import { requestTime } from "@/server/request-time";

export const metadata: Metadata = adminStaticMetadata("providers");

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
