import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { RolesOverview } from "@/features/management";
import { countUsersByRole } from "@/server/admin/insights";

export const metadata: Metadata = {
  title: "Roles",
  description: "Cumulative roles and permissions",
};

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