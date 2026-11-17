import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { PayoutsContent } from "@/server/teaching/payouts-page";

export const metadata: Metadata = {
  title: "Payout approvals",
  description: "Approve and record teacher payouts",
};

export default function AdminFinancePayoutsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <PayoutsContent mode="admin" root={{ title: "Admin", to: "/admin" }} />
    </Suspense>
  );
}
