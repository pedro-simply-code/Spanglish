import { getClassStatus, type LiveClass } from "@/features/classes";
import { env } from "@/env";
import { isClassLiveSessionActive } from "@/server/classes/class-live-session";

export type ClassSessionPhase = ReturnType<typeof getClassStatus>;

/** Whether the class is in its scheduled window and the teacher has started when required. */
export function isClassBroadcastLiveSync(
  sessionStatus: ClassSessionPhase,
  teacherStartsRequired: boolean,
  teacherSessionActive: boolean,
): boolean {
  return sessionStatus === "in-progress" && (!teacherStartsRequired || teacherSessionActive);
}

export async function isClassBroadcastLive(item: LiveClass, nowIso: string): Promise<boolean> {
  const sessionStatus = getClassStatus(item, nowIso);
  const teacherStartsRequired = env.CLASS_TEACHER_STARTS_SESSION;
  const teacherSessionActive = teacherStartsRequired ? await isClassLiveSessionActive(item.id) : true;
  return isClassBroadcastLiveSync(sessionStatus, teacherStartsRequired, teacherSessionActive);
}