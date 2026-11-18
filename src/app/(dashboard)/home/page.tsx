import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { ProfileCompletionCard } from "@/features/auth";
import { getClassStatus, getJoinState, loadClassesForActor } from "@/features/classes";
import { HomeOverview } from "@/features/home";
import { appNow } from "@/lib/app-clock";
import { resolveTimeZone } from "@/lib/timezone";
import { getProfileCompletion } from "@/server/auth/profile-completion";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { getClassPolicy } from "@/server/classes/class-policy";
import { listBalancesForStudent } from "@/server/credits/credits";
import { listAssignmentsForStudent } from "@/server/learning/assignments";
import { getStudentInsights, listLessonHistory } from "@/server/learning/insights";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("student");
  return {
    title: t("meta.home.title"),
    description: t("meta.home.description"),
  };
}

export default function HomePage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  const actor = await requireDashboard("student");
  const firstName = actor.name.split(" ")[0] || actor.name;
  const profile = await getUserProfile(actor.userId);
  const timeZone = resolveTimeZone(profile?.timezone);
  const now = appNow();
  const policy = getClassPolicy();

  const [completion, classes, balances, insights, assignments, lessons] = await Promise.all([
    getProfileCompletion(actor),
    loadClassesForActor(actor),
    listBalancesForStudent(actor.userId),
    getStudentInsights(actor.userId, timeZone),
    listAssignmentsForStudent(actor.userId),
    listLessonHistory(actor.userId),
  ]);

  const upcoming = classes
    .filter((item) => {
      const status = getClassStatus(item, now);
      return status === "upcoming" || status === "in-progress";
    })
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const next = upcoming[0];

  const pendingAssignments = assignments
    .filter((item) => !item.mySubmission)
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"))
    .slice(0, 3);

  return (
    <>
      <ProfileCompletionCard completion={completion} />
      <HomeOverview
        firstName={firstName}
        timeZone={timeZone}
        nextClass={
          next
            ? {
                id: next.id,
                topic: next.topic,
                teacherName: next.teacherName,
                teacherAvatar: next.teacherAvatar,
                startsAt: next.startsAt,
                durationMinutes: next.duration,
                type: next.type,
                canJoin: getJoinState(next, now, policy).canJoin,
              }
            : null
        }
        upcomingCount={upcoming.length}
        balances={balances
          .filter((item) => item.balance > 0)
          .map((item) => ({
            classType: item.classType,
            durationMinutes: item.durationMinutes,
            balance: item.balance,
            shared: item.shared,
          }))}
        insights={insights}
        pendingAssignments={pendingAssignments}
        lastLesson={lessons[0] ?? null}
      />
    </>
  );
}
