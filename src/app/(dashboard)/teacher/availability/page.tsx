import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { appNowDate } from "@/lib/app-clock";
import { AvailabilityEditor } from "@/features/teaching";
import { requireDashboard } from "@/server/auth/session";
import { getTeacherTimeZone, listAvailability } from "@/server/classes/availability";
import { listClassesForTeacher } from "@/server/classes/class-repository";
import { getTeacherProfile } from "@/server/classes/teachers";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("educator.metadata.availability");
  return { title: t("title"), description: t("description") };
}

export default function TeacherAvailabilityPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <AvailabilityContent />
    </Suspense>
  );
}

async function AvailabilityContent() {
  const actor = await requireDashboard("teacher");
  const [windows, profile, timeZone, classes] = await Promise.all([
    listAvailability(actor.userId),
    getTeacherProfile(actor.userId),
    getTeacherTimeZone(actor.userId),
    listClassesForTeacher(actor.userId),
  ]);
  const now = appNowDate().getTime();

  return (
    <AvailabilityEditor
      windows={windows}
      profile={profile}
      timeZone={timeZone}
      upcomingClasses={
        classes.filter((item) => !item.statusOverride && new Date(item.startsAt).getTime() > now).length
      }
    />
  );
}
