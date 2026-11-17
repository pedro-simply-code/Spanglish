import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { FinanceLedgerOverview } from "@/features/admin";
import { getAdminDashboardCharts } from "@/server/admin/dashboard-charts";
import { formatCents, getFinanceSummary } from "@/server/teaching/earnings";
import { requestTime } from "@/server/request-time";

export const metadata: Metadata = {
  title: "Credit ledger",
  description: "Revenue, prepaid credits and teacher pay from the database",
};

export default function AdminFinanceLedgerPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  await requestTime();
  const [summary, charts] = await Promise.all([getFinanceSummary(), getAdminDashboardCharts()]);
  const margin = summary.revenueCents - summary.deferredRevenueCents - summary.teacherEarnedCents;
  return (
    <FinanceLedgerOverview
      charts={charts}
      snapshots={[
        { id: "revenue", label: "Package revenue", value: formatCents(summary.revenueCents), trend: `${summary.orders} orders · ${summary.creditsSold} credits sold` },
        { id: "deferred", label: "Prepaid, not taught", value: formatCents(summary.deferredRevenueCents), trend: `${summary.creditsOutstanding} credits in student accounts` },
        { id: "earned", label: "Teacher pay earned", value: formatCents(summary.teacherEarnedCents), trend: `${summary.deliveredClasses} delivered classes · ${formatCents(summary.teacherEarnedThisMonthCents)} this month` },
        { id: "paid", label: "Teacher pay sent", value: formatCents(summary.teacherPaidCents), trend: `${formatCents(summary.teacherUnbatchedCents)} not in a payout yet` },
        { id: "margin", label: "Academy margin (delivered)", value: formatCents(margin), trend: "Revenue − prepaid − teacher pay" },
      ]}
    />
  );
}
