import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { PayoutsContent } from "@/server/teaching/payouts-page";

export const metadata: Metadata = {
  title: "Teacher payouts",
  description: "Prepare teacher payouts for admin approval",
};

export default function ManagerPayoutsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <PayoutsContent mode="manager" root={{ title: "Manager", to: "/manager" }} />
    </Suspense>
  );
}
