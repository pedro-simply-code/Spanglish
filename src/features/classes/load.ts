import type { AuthSession } from "@/lib/auth-types";
import type { LiveClass } from "@/features/classes/types";
import {
  getClassView,
  getSessionAccess,
  listAllClasses,
  listClassesForStudent,
  listClassesForTeacher,
} from "@/server/classes/class-repository";

const STAFF_WINDOW_DAYS = 60;


/** Classes for the active dashboard — not the union of every role on the account. */
export async function loadClassesForActor(actor: AuthSession): Promise<LiveClass[]> {
  if (actor.activeRole === "teacher") {
    return listClassesForTeacher(actor.userId);
  }

  if (actor.activeRole === "admin") {
    const from = new Date(Date.now() - STAFF_WINDOW_DAYS * 86_400_000);
    return listAllClasses({ from });
  }

  if (actor.activeRole === "manager") {
    return [];
  }

  return listClassesForStudent(actor.userId);
}

export type ClassRelation = "participant" | "teacher" | "staff";

/** How the actor relates to a class, or null when they may not see it. */
export async function getClassRelation(
  classId: string,
  actor: AuthSession,
): Promise<ClassRelation | null> {
  const access = await getSessionAccess(classId);
  if (!access) return null;
  if (access.row.teacherId === actor.userId) return "teacher";
  if (access.participantIds.includes(actor.userId)) return "participant";
  if (actor.activeRole === "admin" || actor.activeRole === "manager") return "staff";
  return null;
}

export async function loadClassForActor(
  classId: string,
  actor: AuthSession,
): Promise<LiveClass | null> {
  const relation = await getClassRelation(classId, actor);
  if (!relation) return null;
  return getClassView(classId);
}
