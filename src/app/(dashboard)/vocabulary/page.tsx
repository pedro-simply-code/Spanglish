import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { VocabularyOverview } from "@/features/vocabulary";

export const metadata: Metadata = {
  title: "Vocabulary",
  description: "Spanglish vocabulary",
};

export default function VocabularyPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <VocabularyOverview />
    </Suspense>
  );
}
