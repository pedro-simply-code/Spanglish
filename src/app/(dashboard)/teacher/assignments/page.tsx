import type { Metadata } from "next";
import { AssignmentsOverview } from "@/features/materials";
import { getActor } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Assignments",
  description: "Track forms, submissions, and grading",
};

export default async function TeacherAssignmentsPage() {
  const actor = await getActor();

  return <AssignmentsOverview ownerName={actor.name} />;
}
