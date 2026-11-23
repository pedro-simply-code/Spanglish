import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { classTranscriptSegments } from "@/server/db/schema";

import type { ClassTranscriptLine } from "@/lib/class-captions";
import type { AuthSession } from "@/lib/auth-types";
import type { TranscriptSpeakerRole } from "@/lib/lesson-summary";
import { canWatchClass } from "@/server/classes/recordings";

export type TranscriptSegmentInput = {
  id: string;
  sessionId: string;
  speakerIdentity: string;
  speakerUserId: string | null;
  speakerName: string;
  speakerRole?: TranscriptSpeakerRole | null;
  body: string;
  lang: string;
  spokenAt: Date;
};

export async function insertTranscriptSegments(rows: TranscriptSegmentInput[]) {
  if (!rows.length) return;
  await db.insert(classTranscriptSegments).values(rows).onConflictDoNothing();
}

export async function listTranscriptSegments(
  sessionId: string,
  limit = 5000,
): Promise<ClassTranscriptLine[]> {
  const rows = await db
    .select()
    .from(classTranscriptSegments)
    .where(eq(classTranscriptSegments.sessionId, sessionId))
    .orderBy(asc(classTranscriptSegments.spokenAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.id,
    speakerIdentity: row.speakerIdentity,
    speakerName: row.speakerName,
    speakerRole: row.speakerRole ?? null,
    text: row.body,
    lang: row.lang,
    at: row.spokenAt.toISOString(),
  }));
}

/** The class transcript for the class page; empty unless the actor may watch the class. */
export async function listClassTranscript(
  actor: AuthSession,
  sessionId: string,
): Promise<ClassTranscriptLine[]> {
  if (!(await canWatchClass(actor, sessionId))) return [];
  return listTranscriptSegments(sessionId);
}
