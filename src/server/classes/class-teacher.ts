import type { AuthSession } from "@/lib/auth-types";
import { hasRole } from "@/lib/auth-roles";
import type { LiveClass } from "@/features/classes";

/** Teacher assigned to teach this class (room creator for host controls). */
export function isAssignedClassTeacher(actor: AuthSession, item: LiveClass) {
  return hasRole(actor.roles, "teacher") && item.teacherId === actor.userId;
}

/** Host toolbar and server moderation — only the teacher assigned to this class. */
export function canModerateClassroom(actor: AuthSession, item: LiveClass): boolean {
  return isAssignedClassTeacher(actor, item);
}

/** Manager/admin accounts must not join the LiveKit room as enrolled users. */
export function isStaffObserverAccount(actor: AuthSession): boolean {
  return hasRole(actor.roles, "manager") || hasRole(actor.roles, "admin");
}

/** Manager/admin in the room as audience (not host). Same UI as students; self-serve mic/cam/share. */
export function isStaffClassAudience(actor: AuthSession, item: LiveClass): boolean {
  return isStaffObserverAccount(actor) && !isAssignedClassTeacher(actor, item);
}

/** @deprecated use isStaffClassAudience */
export function mustJoinClassAsStaffGuest(actor: AuthSession, item: LiveClass): boolean {
  return isStaffClassAudience(actor, item);
}