import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { TeacherAssignments } from "@/features/learning";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getAssignmentForTeacher, listAssignmentsForTeacher } from "@/server/learning/assignments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.assignments");
  return { title: t("title"), description: t("description") };
}

type PageProps = { searchParams: Promise<{ id?: string | string[] }> };

export default function TeacherAssignmentsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AssignmentsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function AssignmentsContent({ searchParams }: PageProps) {
  await connection();
  const [actor, query] = await Promise.all([requireDashboard("teacher"), searchParams]);
  const [assignments, profile] = await Promise.all([
    listAssignmentsForTeacher(actor),
    getUserProfile(actor.userId),
  ]);
  const requested = typeof query.id === "string" ? query.id : undefined;
  // Open the requested assignment, else the first with work to grade, else the latest with submissions.
  const openId =
    requested ??
    assignments.find((item) => item.submittedCount > item.gradedCount)?.id ??
    assignments.find((item) => item.submittedCount > 0)?.id;
  const selected = openId ? await getAssignmentForTeacher(actor, openId) : null;
  return (
    <TeacherAssignments
      assignments={assignments}
      selected={selected}
      timeZone={resolveTimeZone(profile?.timezone)}
    />
  );
}
