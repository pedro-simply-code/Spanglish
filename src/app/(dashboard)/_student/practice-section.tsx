import { PracticeOverview } from "@/features/practice";
import { resolveTimeZone } from "@/lib/timezone";
import { requireDashboard } from "@/server/auth/session";
import { getUserProfile } from "@/server/auth/user-repository";
import { listAssignmentsForStudent } from "@/server/learning/assignments";

export async function PracticeSection() {
  const actor = await requireDashboard("student");
  const [assignments, profile] = await Promise.all([
    listAssignmentsForStudent(actor.userId),
    getUserProfile(actor.userId),
  ]);
  return <PracticeOverview assignments={assignments} timeZone={resolveTimeZone(profile?.timezone)} />;
}
