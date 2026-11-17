import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AppCardSkeleton } from "@/components/ui/app-card-skeleton";
import { loadClassesForActor } from "@/features/classes";
import { ClassesOverview } from "@/features/classroom";
import { appNow } from "@/lib/app-clock";
import { getClassPolicy } from "@/server/classes/class-policy";
import { getActor } from "@/server/auth/session";
import { listBalancesForStudent } from "@/server/credits/credits";

export const metadata: Metadata = {
  title: "My classes",
  description: "Join, review, reschedule, or cancel your live classes",
};

export default function ClassesPage() {
  return (
    <Suspense fallback={<AppCardSkeleton />}>
      <ClassesContent />
    </Suspense>
  );
}

async function ClassesContent() {
  const actor = await getActor();
  if (actor.activeRole === "manager") {
    redirect("/apps/calendar");
  }
  const policy = getClassPolicy();
  const isStudent = actor.activeRole === "student";
  const staffView = actor.activeRole === "admin";
  const [items, balances] = await Promise.all([
    loadClassesForActor(actor),
    isStudent && !staffView ? listBalancesForStudent(actor.userId) : Promise.resolve(null),
  ]);

  return (
    <ClassesOverview
      policy={policy}
      items={items}
      now={appNow()}
      viewMode={staffView ? "staff" : "student"}
      credits={
        balances?.map(({ classType, durationMinutes, balance, shared }) => ({
          classType,
          durationMinutes,
          balance,
          shared,
        })) ?? null
      }
    />
  );
}
