import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { MaterialDetail, getFormQuestions, getMaterialGrants } from "@/features/materials";
import { getActorWithPermission } from "@/server/auth/session";
import { getMaterialForViewer } from "@/server/materials/library";

export const metadata: Metadata = {
  title: "Material",
  description: "Shared class material",
};

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
      grants={getMaterialGrants(id)}
      questions={getFormQuestions(id)}
    />
  );
}
