import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { educatorStaticMetadata } from "@/i18n/static-page-metadata";
import { ManagerOverview } from "@/features/staff";
import { appNow } from "@/lib/app-clock";
import { localizedTeacherLevelNameByName } from "@/lib/teacher-levels";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getManagerHome } from "@/server/teaching/manager-home";

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
  const profile = await getUserProfile(actor.userId);
  const timeZone = resolveTimeZone(profile?.timezone);
  const home = await getManagerHome(timeZone);

  return (
    <ManagerOverview
      firstName={actor.name.split(" ")[0] || actor.name}
      timeZone={timeZone}
      now={appNow()}
      home={{
        ...home,
        team: home.team.map((teacher) => ({
          ...teacher,
          levelName: localizedTeacherLevelNameByName(teacher.levelName, t),
        })),
      }}
    />
  );
}
