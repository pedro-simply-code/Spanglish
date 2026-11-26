import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { MaterialDetail, getFormQuestions } from "@/features/materials";
import { getActorWithPermission } from "@/server/auth/session";
import { getMaterialForViewer, getMaterialQuestions } from "@/server/materials/library";
import { getPracticeStats } from "@/server/materials/practice-results";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.studentMaterial");
  return { title: t("title"), description: t("description") };
}

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

export default function MaterialPage({ params }: MaterialPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <MaterialContent params={params} />
    </Suspense>
  );
}

async function MaterialContent({ params }: MaterialPageProps) {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) notFound();

  const { id } = await params;
  const material = await getMaterialForViewer(actor, id);
  if (!material) notFound();

  return (
    <MaterialDetail
      material={material}
      viewer="student"
      grants={[]}
      questions={await questionsFor(id)}
      practiceStats={material.kind === "practice" ? await getPracticeStats(actor.userId, id) : undefined}
    />
  );
}

/** Stored questions; demo materials fall back to their fixture questions. */
async function questionsFor(id: string) {
  const stored = await getMaterialQuestions(id);
  return stored.length ? stored : getFormQuestions(id);
}
