import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { getClassStatus, getJoinState, loadClassesForActor } from "@/features/classes";
import { TeacherOverview } from "@/features/staff";
import { appNow } from "@/lib/app-clock";
import { resolveTimeZone } from "@/lib/timezone";
import { getProfileCompletion } from "@/server/auth/profile-completion";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getClassPolicy } from "@/server/classes/class-policy";
import { getTeacherDashboardExtras } from "@/server/teaching/dashboards";
import { getTeacherHome } from "@/server/teaching/teacher-home";
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
  const locale = (await getLocale()) === "es" ? "es" : "en";

  const [ownClasses, completion, extras, home, profile] = await Promise.all([
    loadClassesForActor(actor),
    getProfileCompletion(actor),
    getTeacherDashboardExtras(actor.userId),
    getTeacherHome(actor.userId, locale),
    getUserProfile(actor.userId),
  ]);
  const now = appNow();
  const policy = getClassPolicy();

  // Upcoming and live classes with the classroom state, soonest first.
  const upcoming = ownClasses
    .filter((item) => {
      const status = getClassStatus(item, now);
      return status === "upcoming" || status === "in-progress";
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((item) => ({
      ...item,
      canJoin: getJoinState(item, now, policy).canJoin,
      // "Live now" only inside the real window, even when early entry is allowed.
      live: getJoinState(item, now, { ...policy, relaxJoinWindow: false }).canJoin,
    }));

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
    <TeacherOverview
      firstName={actor.name.split(" ")[0] || actor.name}
      timeZone={resolveTimeZone(profile?.timezone)}
      now={now}
      upcoming={upcoming}
      ownClasses={ownClasses}
      extras={localizedExtras}
      home={home}
      profileReminder={!completion.hasPhoto ? "photo" : !completion.twoFactorEnabled ? "twoFactor" : null}
    />
  );
}
