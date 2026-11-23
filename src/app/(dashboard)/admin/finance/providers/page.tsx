import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import Stack from "@mui/material/Stack";
import { FinanceProvidersOverview, PendingPaymentsCard } from "@/features/admin";
import { listPendingPayments } from "@/server/payments/reconcile";
import { stripeEnabled } from "@/server/payments/stripe";
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
  const [{ providers, settings }, pending] = await Promise.all([
    buildPaymentProviders(),
    stripeEnabled ? listPendingPayments() : Promise.resolve([]),
  ]);
  return (
    <Stack spacing={3}>
      <FinanceProvidersOverview providers={providers} settings={settings} />
      <PendingPaymentsCard payments={pending} stripeOn={stripeEnabled} />
    </Stack>
  );
}
