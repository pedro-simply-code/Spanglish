import { and, eq, inArray } from "drizzle-orm";
import { isStaffGuestIdentity, STAFF_GUEST_IDENTITY_PREFIX } from "@/lib/classroom-identities";
import type { TranscriptSpeakerRole } from "@/lib/lesson-summary";
import { insertTranscriptSegments, type TranscriptSegmentInput } from "@/server/classes/class-transcript-repository";
import { db } from "@/server/db";
import { classParticipants, classSessions, users } from "@/server/db/schema";

/*
 * Lines from the classroom agent (agent/classroom-agent.ts). The agent runs one
 * transcriber per participant, so each line arrives with the identity of the
 * person who spoke; their role comes from the class itself, never from the voice.
 */

const MAX_LINES_PER_CALL = 100;
const MAX_LINE_CHARS = 2000;

export type AgentTranscriptLine = {
  /** Stable id from the agent, so a retried post is not saved twice. */
  id: string;
  /** LiveKit identity of the speaker (the user id, or guest-staff-<id> for staff observers). */
  identity: string;
  name: string;
  text: string;
  /** Language Deepgram detected for the line (e.g. "es", "en"). */
  lang: string;
  /** When the line was spoken (ISO date). */
  at: string;
};

/** The id of the user behind a LiveKit identity, or null for anonymous guests. */
function userIdOf(identity: string) {
  if (isStaffGuestIdentity(identity)) return identity.slice(STAFF_GUEST_IDENTITY_PREFIX.length);
  if (identity.startsWith("guest-") || identity.startsWith("agent-")) return null;
  return identity;
}

export async function saveAgentTranscript(
  sessionId: string,
  lines: AgentTranscriptLine[],
): Promise<{ saved: number } | null> {
  const [session] = await db
    .select({ id: classSessions.id, teacherId: classSessions.teacherId })
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  if (!session) return null;

  const clean = lines
    .slice(0, MAX_LINES_PER_CALL)
    .map((line) => ({
      id: String(line.id ?? "").slice(0, 160),
      identity: String(line.identity ?? "").slice(0, 160),
      name: String(line.name ?? "").trim().slice(0, 120),
      text: String(line.text ?? "").trim().slice(0, MAX_LINE_CHARS),
      lang: String(line.lang ?? "").slice(0, 12) || "multi",
      at: Date.parse(String(line.at ?? "")),
    }))
    .filter((line) => line.id && line.identity && line.text);
  if (!clean.length) return { saved: 0 };

  const userIds = [...new Set(clean.map((line) => userIdOf(line.identity)).filter((id): id is string => Boolean(id)))];
  const [students, people] = await Promise.all([
    userIds.length
      ? db
          .select({ userId: classParticipants.userId })
          .from(classParticipants)
          .where(and(eq(classParticipants.sessionId, sessionId), inArray(classParticipants.userId, userIds)))
      : [],
    userIds.length ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, userIds)) : [],
  ]);
  const studentIds = new Set(students.map((row) => row.userId));
  const names = new Map(people.map((row) => [row.id, row.name]));

  const roleOf = (identity: string, userId: string | null): TranscriptSpeakerRole => {
    if (isStaffGuestIdentity(identity)) return "staff";
    if (!userId) return "guest";
    if (userId === session.teacherId) return "teacher";
    return studentIds.has(userId) ? "student" : "guest";
  };

  const now = Date.now();
  const rows: TranscriptSegmentInput[] = clean.map((line) => {
    const userId = userIdOf(line.identity);
    const known = userId && names.has(userId) ? userId : null;
    return {
      id: line.id,
      sessionId,
      speakerIdentity: line.identity,
      speakerUserId: known,
      speakerName: (known ? names.get(known) : null) || line.name || line.identity,
      speakerRole: roleOf(line.identity, known),
      body: line.text,
      lang: line.lang,
      // The agent's clock, unless it is far off from ours.
      spokenAt: Number.isFinite(line.at) && Math.abs(line.at - now) < 6 * 60 * 60_000 ? new Date(line.at) : new Date(now),
    };
  });
  await insertTranscriptSegments(rows);
  return { saved: rows.length };
}
