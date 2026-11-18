import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db";
import { classSessions, classTranscriptSegments } from "@/server/db/schema";

import {
  isCaptionLang,
  type ClassCaptionsState,
  type ClassTranscriptLine,
} from "@/lib/class-captions";
import type { AuthSession } from "@/lib/auth-types";
import { canWatchClass } from "@/server/classes/recordings";

export async function getClassCaptions(sessionId: string): Promise<ClassCaptionsState> {
  const [row] = await db
    .select({ enabled: classSessions.captionsEnabled, lang: classSessions.captionsLang })
    .from(classSessions)
    .where(eq(classSessions.id, sessionId))
    .limit(1);
  return {
    enabled: Boolean(row?.enabled),
    lang: isCaptionLang(row?.lang) ? row.lang : "es-ES",
  };
}

export async function setClassCaptions(sessionId: string, state: ClassCaptionsState) {
  await db
    .update(classSessions)
    .set({ captionsEnabled: state.enabled, captionsLang: state.lang, updatedAt: new Date() })
    .where(eq(classSessions.id, sessionId));
}

export type TranscriptSegmentInput = {
  id: string;
  sessionId: string;
  speakerIdentity: string;
  speakerUserId: string | null;
  speakerName: string;
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
