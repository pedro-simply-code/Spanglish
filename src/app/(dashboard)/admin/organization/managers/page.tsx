import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { OrganizationManagersOverview } from "@/features/admin";
import { listPendingManagerInvitations } from "@/server/admin/manager-access";
import { listManagers } from "@/server/admin/insights";
import { requireDashboard } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Managers",
  description: "Operations managers for the academy",
};

export default function AdminOrganizationManagersPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const actor = await requireDashboard("admin");
  const [managers, invitations] = await Promise.all([listManagers(), listPendingManagerInvitations()]);
  return (
    <OrganizationManagersOverview
      managers={managers}
      invitations={invitations}
      mailFromName={actor.name}
    />
  );
}