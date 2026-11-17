import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { MaterialModerationReview } from "@/features/materials/components/material-moderation-review";
import { getFormQuestions } from "@/features/materials";
import { getActorWithPermission } from "@/server/auth/session";
import { getMaterialForViewer } from "@/server/materials/library";

type PageProps = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Review material ${id}`,
    description: "Preview and publish an academy library post",
  };
}

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

  return <MaterialModerationReview material={material} questions={getFormQuestions(id)} />;
}