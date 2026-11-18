import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { IntegrationsOverview } from "@/features/management";
import { buildIntegrationStatuses } from "@/server/admin/insights";

export const metadata: Metadata = adminStaticMetadata("integrations");

export default function AdminPlatformIntegrationsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <IntegrationsPageContent />
    </Suspense>
  );
}

async function IntegrationsPageContent() {
  const integrations = await buildIntegrationStatuses();
  return <IntegrationsOverview integrations={integrations} />;
}
