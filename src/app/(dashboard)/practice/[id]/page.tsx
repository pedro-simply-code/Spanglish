import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import {
  FormRunner,
  getFormQuestions,
  getMaterialById,
  getStudentMaterials,
} from "@/features/materials";
import { getActorWithPermission } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Practice",
  description: "Assigned practice form",
};

type PracticeFormPageProps = {
  params: Promise<{ id: string }>;
};

export default function PracticeFormPage({ params }: PracticeFormPageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <PracticeFormContent params={params} />
    </Suspense>
  );
}

async function PracticeFormContent({ params }: PracticeFormPageProps) {
  const actor = await getActorWithPermission("materials:read");

  if (!actor) {
    notFound();
  }

  const { id } = await params;
  const material = getMaterialById(id);

  if (!material || material.kind !== "form") {
    notFound();
  }

  const questions = getFormQuestions(id);

  if (!questions.length) {
    notFound();
  }

  const grant = getStudentMaterials().find(
    (entry) => entry.material.id === id,
  )?.grant;

  return (
    <FormRunner
      material={material}
      questions={questions}
      dueAt={grant?.dueAt}
    />
  );
}
