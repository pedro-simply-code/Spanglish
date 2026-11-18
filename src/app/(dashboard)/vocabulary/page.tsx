import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { VocabularyOverview } from "@/features/vocabulary";
import { appNow } from "@/lib/app-clock";
import { requireDashboard } from "@/server/auth/session";
import { listStudentWords } from "@/server/learning/vocabulary";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.vocabulary.title"),
    description: t("meta.vocabulary.description"),
  };
}

export default function VocabularyPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <VocabularyContent />
    </Suspense>
  );
}

async function VocabularyContent() {
  const actor = await requireDashboard("student");
  const words = await listStudentWords(actor.userId);
  return <VocabularyOverview words={words} now={appNow()} />;
}
