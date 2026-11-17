import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { AdminTwoFactorNotice } from "@/features/auth";
import { ExecutiveOverview } from "@/features/admin";
import {
  formatAuditActivity,
  getExecutiveStats,
  getPlatformHealthAlerts,
  getRecentAuditForDashboard,
} from "@/server/admin/insights";
import { getAdminDashboardCharts } from "@/server/admin/dashboard-charts";
import { requireDashboard } from "@/server/auth/session";
import { getAdminFinanceOverview } from "@/server/teaching/dashboards";

export const metadata: Metadata = {
  title: "Admin dashboard",
  description: "Platform access and academy governance",
};

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AdminDashboardContent />
    </Suspense>
  );
}

async function AdminDashboardContent() {
  const actor = await requireDashboard("admin");
  const [stats, alerts, recent, finance, charts] = await Promise.all([
    getExecutiveStats(),
    getPlatformHealthAlerts(),
    getRecentAuditForDashboard(),
    getAdminFinanceOverview(),
    getAdminDashboardCharts(),
  ]);
  const activity = recent.map(formatAuditActivity);
  const nameParts = actor.name.trim().split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? actor.name;
  const lastName = nameParts.slice(1).join(" ");

  return (
    <>
      {actor.twoFactorEnabled ? null : <AdminTwoFactorNotice userId={actor.userId} />}
      <ExecutiveOverview
        firstName={firstName}
        lastName={lastName}
        stats={stats}
        charts={charts}
        alerts={[...finance.alerts, ...alerts]}
        activity={activity}
        topMargin={actor.twoFactorEnabled ? 3 : 0}
      />
    </>
  );
}