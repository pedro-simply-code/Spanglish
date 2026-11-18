import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { addDays, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { CalendarOverview } from "@/features/calendar";
import { getActor } from "@/server/auth/session";
import { calendarRoleOf, hasCalendarFeed, loadCalendarData } from "@/server/calendar/events";
import { listTeachers } from "@/server/classes/teachers";
import { requestTime } from "@/server/request-time";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apps");
  return {
    title: t("metadata.calendar.title"),
    description: t("metadata.calendar.description"),
  };
}

export default function CalendarPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <CalendarContent />
    </Suspense>
  );
}

async function CalendarContent() {
  const actor = await getActor();
  const role = calendarRoleOf(actor);
  // The admin dashboard has no calendar: its dates live in payout approvals.
  if (!role) redirect("/admin/finance/payouts");

  await requestTime();
  const now = new Date();
  // First load: visible month grid (includes padding weeks), same range as month view in the UI.
  const from = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
  const to = addDays(endOfWeek(endOfMonth(now), { weekStartsOn: 1 }), 1);
  const [data, teachers, hasFeed] = await Promise.all([
    loadCalendarData(actor, {
      from: from.toISOString(),
      to: to.toISOString(),
    }),
    role === "manager" ? listTeachers() : Promise.resolve([]),
    hasCalendarFeed(actor.userId),
  ]);

  return (
    <CalendarOverview
      role={role}
      initialDate={now.toISOString()}
      initialClasses={data.classes}
      initialAvailability={data.availability}
      teachers={teachers.map((teacher) => ({ id: teacher.id, name: teacher.name }))}
      hasFeed={hasFeed}
    />
  );
}
