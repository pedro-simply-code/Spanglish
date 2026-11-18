import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { ManagerOverview } from "@/features/staff";
import { requireDashboard } from "@/server/auth/session";
import { getManagerDashboardSnapshot } from "@/server/teaching/dashboards";
import { localizedTeacherLevelNameByName } from "@/lib/teacher-levels";

export const metadata: Metadata = educatorStaticMetadata("managerDashboard");

export default function ManagerDashboardPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ManagerDashboardContent />
    </Suspense>
  );
}

async function ManagerDashboardContent() {
  const t = await getTranslations("educator");
  const actor = await requireDashboard("manager");
  const snapshot = await getManagerDashboardSnapshot();

  const localizedSnapshot = {
    ...snapshot,
    team: snapshot.team.map((teacher) => ({
      ...teacher,
      levelName: localizedTeacherLevelNameByName(teacher.levelName, t),
    })),
  };

  return (
    <ManagerOverview firstName={actor.name.split(" ")[0] || actor.name} snapshot={localizedSnapshot} />
  );
}