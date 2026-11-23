import { loadClassesForActor } from "@/features/classes";
import { ClassesOverview } from "@/features/classroom";
import { appNow } from "@/lib/app-clock";
import type { AuthSession } from "@/lib/auth-types";
import { getClassPolicy } from "@/server/classes/class-policy";
import { listBalancesForStudent } from "@/server/credits/credits";
import { getAcademySupportContact } from "@/server/messages/recipients";

/** The student's classes (upcoming, completed, canceled) with their credits. */
export async function ClassesSection({ actor }: { actor: AuthSession }) {
  const [items, balances, support] = await Promise.all([
    loadClassesForActor(actor),
    listBalancesForStudent(actor.userId),
    getAcademySupportContact(),
  ]);
  return (
    <ClassesOverview
      policy={getClassPolicy()}
      items={items}
      now={appNow()}
      viewMode="student"
      viewerId={actor.userId}
      support={support ? { ...support, fromName: actor.name } : null}
      credits={balances.map(({ classType, durationMinutes, balance, shared }) => ({
        classType,
        durationMinutes,
        balance,
        shared,
      }))}
    />
  );
}
