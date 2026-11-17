import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import {
  MaterialDetail,
  MaterialVisibilityControl,
  getAssignmentsForMaterial,
  getFormQuestions,
  getMaterialGrants,
  getSubmissions,
} from "@/features/materials";
import { getActorWithPermission } from "@/server/auth/session";
import { getMaterialForViewer } from "@/server/materials/library";

export const metadata: Metadata = {
  title: "Material",
  description: "Material details, shares, and results",
};

type MaterialPageProps = {
  params: Promise<{ id: string }>;
};

export default function TeacherMaterialPage({ params }: MaterialPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <TeacherMaterial params={params} />
    </Suspense>
  );
}

async function TeacherMaterial({ params }: MaterialPageProps) {
  const actor = await getActorWithPermission("materials:write");
  if (!actor) notFound();

  const { id } = await params;
  const material = await getMaterialForViewer(actor, id);
  if (!material) notFound();

  // Assignments, submissions and forms are still demo data (not in the database yet).
  const assignments = getAssignmentsForMaterial(id);
  const submissions = assignments.flatMap((assignment) => getSubmissions(assignment.id));

  return (
    <>
      <MaterialDetail
        material={material}
        viewer="teacher"
        grants={getMaterialGrants(id)}
        assignments={assignments}
        submissions={submissions}
        questions={getFormQuestions(id)}
      />
      {material.ownerId === actor.userId ? (
        <Box mt={3}>
          <MaterialVisibilityControl material={material} />
        </Box>
      ) : null}
    </>
  );
}
