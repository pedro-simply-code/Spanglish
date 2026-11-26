import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
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
import { getMaterialForViewer, getMaterialQuestions } from "@/server/materials/library";
import { listPracticeResults } from "@/server/materials/practice-results";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.material");
  return { title: t("title"), description: t("description") };
}

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

  const isStaff = actor.roles.includes("manager") || actor.roles.includes("admin");
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
        questions={await questionsFor(id)}
        practiceResults={
          material.kind === "practice" && (material.ownerId === actor.userId || isStaff)
            ? await listPracticeResults(actor, id)
            : undefined
        }
      />
      {material.ownerId === actor.userId ? (
        <Box mt={3}>
          <MaterialVisibilityControl material={material} />
        </Box>
      ) : null}
    </>
  );
}

/** Stored questions; demo materials fall back to their fixture questions. */
async function questionsFor(id: string) {
  const stored = await getMaterialQuestions(id);
  return stored.length ? stored : getFormQuestions(id);
}
