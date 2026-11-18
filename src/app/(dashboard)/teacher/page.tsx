import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { loadClassesForActor } from "@/features/classes";
import { ProfileCompletionCard } from "@/features/auth";
import { TeacherOverview } from "@/features/staff";
import { getProfileCompletion } from "@/server/auth/profile-completion";
import { appNow } from "@/lib/app-clock";
import { requireDashboard } from "@/server/auth/session";
import { getTeacherDashboardExtras } from "@/server/teaching/dashboards";
import {
  localizedTeacherBadgeList,
  localizedTeacherLevelNameByName,
} from "@/lib/teacher-levels";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.teacherDashboard");
  return { title: t("title"), description: t("description") };
}

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <TeacherDashboardContent />
    </Suspense>
  );
}

async function TeacherDashboardContent() {
  const t = await getTranslations("educator");
  const actor = await requireDashboard("teacher");

  const [ownClasses, completion, extras] = await Promise.all([
    loadClassesForActor(actor),
    getProfileCompletion(actor),
    getTeacherDashboardExtras(actor.userId),
  ]);

  const localizedExtras = {
    ...extras,
    levelName: localizedTeacherLevelNameByName(extras.levelName, t),
    nextLevel: extras.nextLevel
      ? {
          ...extras.nextLevel,
          name: localizedTeacherLevelNameByName(extras.nextLevel.name, t),
        }
      : null,
    badges: localizedTeacherBadgeList(extras.badges, t),
  };

  return (
    <>
      <ProfileCompletionCard completion={completion} />
      <TeacherOverview
        firstName={actor.name.split(" ")[0] || actor.name}
        ownClasses={ownClasses}
        now={appNow()}
        extras={localizedExtras}
      />
    </>
  );
}
