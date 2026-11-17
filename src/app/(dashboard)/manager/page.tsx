import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ManagerOverview } from "@/features/staff";
import { requireDashboard } from "@/server/auth/session";
import { getManagerDashboardSnapshot } from "@/server/teaching/dashboards";

export const metadata: Metadata = {
  title: "Manager dashboard",
  description: "Oversee classes, people, and billing",
};

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ManagerDashboardContent />
    </Suspense>
  );
}

async function ManagerDashboardContent() {
  const actor = await requireDashboard("manager");
  const snapshot = await getManagerDashboardSnapshot();

  return (
    <ManagerOverview firstName={actor.name.split(" ")[0] || actor.name} snapshot={snapshot} />
  );
}