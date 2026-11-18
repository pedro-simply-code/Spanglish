import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { adminStaticMetadata } from "@/i18n/static-page-metadata";
import { FinanceLedgerOverview } from "@/features/admin";
import { getAdminDashboardCharts } from "@/server/admin/dashboard-charts";
import { formatCents, getFinanceSummary } from "@/server/teaching/earnings";
import { requestTime } from "@/server/request-time";

export const metadata: Metadata = adminStaticMetadata("ledger");

export default function AdminFinanceLedgerPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <Content />
    </Suspense>
  );
}

async function Content() {
  const t = await getTranslations("admin");
  await requestTime();
  const [summary, charts] = await Promise.all([getFinanceSummary(), getAdminDashboardCharts()]);
  const margin = summary.revenueCents - summary.deferredRevenueCents - summary.teacherEarnedCents;
  return (
    <FinanceLedgerOverview
      charts={charts}
      snapshots={[
        {
          id: "revenue",
          label: t("finance.ledger.snapshot.revenue"),
          value: formatCents(summary.revenueCents),
          trend: t("finance.ledger.snapshot.revenueTrend", {
            orders: summary.orders,
            credits: summary.creditsSold,
          }),
        },
        {
          id: "deferred",
          label: t("finance.ledger.snapshot.deferred"),
          value: formatCents(summary.deferredRevenueCents),
          trend: t("finance.ledger.snapshot.deferredTrend", { credits: summary.creditsOutstanding }),
        },
        {
          id: "earned",
          label: t("finance.ledger.snapshot.earned"),
          value: formatCents(summary.teacherEarnedCents),
          trend: t("finance.ledger.snapshot.earnedTrend", {
            classes: summary.deliveredClasses,
            thisMonth: formatCents(summary.teacherEarnedThisMonthCents),
          }),
        },
        {
          id: "paid",
          label: t("finance.ledger.snapshot.paid"),
          value: formatCents(summary.teacherPaidCents),
          trend: t("finance.ledger.snapshot.paidTrend", {
            amount: formatCents(summary.teacherUnbatchedCents),
          }),
        },
        {
          id: "margin",
          label: t("finance.ledger.snapshot.margin"),
          value: formatCents(margin),
          trend: t("finance.ledger.snapshot.marginTrend"),
        },
      ]}
    />
  );
}
