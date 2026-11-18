import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { RolesOverview } from "@/features/management";
import { countUsersByRole } from "@/server/admin/insights";

export const metadata: Metadata = adminStaticMetadata("roles");

export default function AdminOrganizationRolesPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const roleCounts = await countUsersByRole();
  return <RolesOverview roleCounts={roleCounts} />;
}
