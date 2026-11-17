import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { LessonsOverview } from "@/features/lessons";

export const metadata: Metadata = {
  title: "Lessons",
  description: "Spanglish lessons",
};

export default function LessonsPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <LessonsOverview />
    </Suspense>
  );
}
