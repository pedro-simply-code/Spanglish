import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { BillingOverview } from "@/features/management";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { requireDashboard } from "@/server/auth/session";
import { getBillingReport } from "@/server/payments/billing-report";

export const metadata: Metadata = educatorStaticMetadata("managerBilling");

export default function ManagerBillingPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requireDashboard("manager");
  return <BillingOverview report={await getBillingReport()} />;
}
