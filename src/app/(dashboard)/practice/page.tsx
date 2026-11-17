import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { PracticeOverview } from "@/features/practice";

export const metadata: Metadata = {
  title: "Practice",
  description: "Spanglish practice activities",
};

export default function PracticePage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <PracticeOverview />
    </Suspense>
  );
}
