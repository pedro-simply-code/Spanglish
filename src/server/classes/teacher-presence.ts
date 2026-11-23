import { eq } from "drizzle-orm";
import { classRoomName } from "@/server/classes/class-repository";
import { isClassLiveSessionActive } from "@/server/classes/class-live-session";
import { sanitizeLiveKitRoomName } from "@/server/classes/livekit";
import { getRoomServiceClient } from "@/server/classes/livekit-api";
import { db } from "@/server/db";
import { classSessions } from "@/server/db/schema";

/**
 * Whether the class's teacher is connected to its LiveKit room right now.
 * null = it can't be checked (LiveKit API not configured or not answering).
 */
export async function isTeacherInRoom(classId: string): Promise<boolean | null> {
  const client = getRoomServiceClient();
  if (!client) return null;
  const [row] = await db
    .select({ teacherId: classSessions.teacherId })
    .from(classSessions)
    .where(eq(classSessions.id, classId))
    .limit(1);
  if (!row) return false;
  try {
    const participants = await client.listParticipants(sanitizeLiveKitRoomName(classRoomName(classId)));
    return participants.some((participant) => participant.identity === row.teacherId);
  } catch (error) {
    // No room yet = nobody is in it.
    const status = (error as { status?: number })?.status;
    if (status === 404 || /does not exist|not found/i.test(String((error as Error)?.message ?? ""))) return false;
    return null;
  }
}

/**
 * Students may go in when the teacher has started the class AND is in the
 * room. A session that was started and never closed (the teacher shut the
 * tab, the room_finished webhook never arrived) does not let them in alone.
 * Students already inside are not sent out when the teacher drops for a moment:
 * this is only checked on the way in.
 */
export async function isClassOpenForStudents(classId: string) {
  if (!(await isClassLiveSessionActive(classId))) return false;
  return (await isTeacherInRoom(classId)) !== false;
}
