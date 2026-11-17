import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ProgressOverview } from "@/features/progress";

export const metadata: Metadata = {
  title: "Progress",
  description: "Spanglish learning progress",
};

export default function ProgressPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ProgressOverview />
    </Suspense>
  );
}
