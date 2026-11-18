import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { AssignmentRunner } from "@/features/practice";
import { resolveTimeZone } from "@/lib/timezone";
import { getActorWithPermission } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getAssignmentForStudent } from "@/server/learning/assignments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.practiceForm.title"),
    description: t("meta.practiceForm.description"),
  };
}

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
  if (!actor) notFound();
  const { id } = await params;
  const [assignment, profile] = await Promise.all([
    getAssignmentForStudent(actor, id),
    getUserProfile(actor.userId),
  ]);
  if (!assignment) notFound();
  return <AssignmentRunner assignment={assignment} timeZone={resolveTimeZone(profile?.timezone)} />;
}
