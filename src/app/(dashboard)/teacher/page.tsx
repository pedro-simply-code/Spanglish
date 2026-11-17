import type { Metadata } from "next";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { loadClassesForActor } from "@/features/classes";
import { ProfileCompletionCard } from "@/features/auth";
import { TeacherOverview } from "@/features/staff";
import { getProfileCompletion } from "@/server/auth/profile-completion";
import { appNow } from "@/lib/app-clock";
import { requireDashboard } from "@/server/auth/session";
import { getTeacherDashboardExtras } from "@/server/teaching/dashboards";

export const metadata: Metadata = {
  title: "Teacher dashboard",
  description: "Manage your live classes and students",
};

export default function TeacherDashboardPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <TeacherDashboardContent />
    </Suspense>
  );
}

async function TeacherDashboardContent() {
  const actor = await requireDashboard("teacher");

  const [ownClasses, completion, extras] = await Promise.all([
    loadClassesForActor(actor),
    getProfileCompletion(actor),
    getTeacherDashboardExtras(actor.userId),
  ]);

  return (
    <>
      <ProfileCompletionCard completion={completion} />
      <TeacherOverview
        firstName={actor.name.split(" ")[0] || actor.name}
        ownClasses={ownClasses}
        now={appNow()}
        extras={extras}
      />
    </>
  );
}
