import type { AuthSession } from "@/lib/auth-types";
import { hasRole } from "@/lib/auth-roles";
import { getSessionAccess } from "@/server/classes/class-repository";

export const isStaffActor = (actor: AuthSession) =>
  hasRole(actor.roles, "manager") || hasRole(actor.roles, "admin");

/** How the actor relates to a class: teacher (or staff) may edit, students read. */
export async function classRelation(actor: AuthSession, sessionId: string) {
  const access = await getSessionAccess(sessionId);
  if (!access) return null;
  const isTeacher = access.row.teacherId === actor.userId;
  const isParticipant = access.participantIds.includes(actor.userId);
  const staff = isStaffActor(actor);
  return {
    row: access.row,
    participantIds: access.participantIds,
    isTeacher,
    isParticipant,
    canEdit: isTeacher || staff,
    canView: isTeacher || isParticipant || staff,
  };
}
