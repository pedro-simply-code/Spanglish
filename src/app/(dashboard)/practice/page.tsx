import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { PracticeOverview } from "@/features/practice";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { listAssignmentsForStudent } from "@/server/learning/assignments";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.practice.title"),
    description: t("meta.practice.description"),
  };
}

export default function PracticePage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <PracticeContent />
    </Suspense>
  );
}

async function PracticeContent() {
  const actor = await requireDashboard("student");
  const [assignments, profile] = await Promise.all([
    listAssignmentsForStudent(actor.userId),
    getUserProfile(actor.userId),
  ]);
  return <PracticeOverview assignments={assignments} timeZone={resolveTimeZone(profile?.timezone)} />;
}
