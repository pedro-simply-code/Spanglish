import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { AchievementsOverview } from "@/features/achievements";

export const metadata: Metadata = {
  title: "Achievements",
  description: "Spanglish achievements",
};

export default function AchievementsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AchievementsOverview />
    </Suspense>
  );
}
