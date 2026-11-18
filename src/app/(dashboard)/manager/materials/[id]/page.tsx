import type { Metadata } from "next";
import { Suspense } from "react";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { notFound } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { getFormQuestions, MaterialModerationReview } from "@/features/materials";
import { getActorWithPermission } from "@/server/auth/session";
import { getMaterialForViewer, getMaterialQuestions } from "@/server/materials/library";

type PageProps = { params: Promise<{ id: string }> };

export const metadata: Metadata = educatorStaticMetadata("managerMaterialReview");

export default function ManagerMaterialReviewPage({ params }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ReviewContent params={params} />
    </Suspense>
  );
}

async function ReviewContent({ params }: PageProps) {
  const actor = await getActorWithPermission("materials:moderate");
  if (!actor) notFound();

  const { id } = await params;
  const material = await getMaterialForViewer(actor, id);
  if (!material || material.visibility !== "global") notFound();

  return <MaterialModerationReview material={material} questions={await questionsFor(id)} />;
}
/** Stored questions; demo materials fall back to their fixture questions. */
async function questionsFor(id: string) {
  const stored = await getMaterialQuestions(id);
  return stored.length ? stored : getFormQuestions(id);
}
