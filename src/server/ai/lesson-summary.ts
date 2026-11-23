import { eq, sql } from "drizzle-orm";
import { after } from "next/server";
import { env } from "@/env";
import type { AuthSession } from "@/lib/auth-types";
import { parseSummaryContent, type LessonSummaryView } from "@/lib/lesson-summary";
import type { ClassTranscriptLine } from "@/lib/class-captions";
import { callClaude, isAnthropicConfigured } from "@/server/ai/anthropic";
import { listTranscriptSegments } from "@/server/classes/class-transcript-repository";
import { canWatchClass } from "@/server/classes/recordings";
import { rowsOf } from "@/server/credits/credits";
import { db } from "@/server/db";
import { classSummaries } from "@/server/db/schema";

/*
 * When a class ends, Claude reads its transcript (written live by the
 * classroom agent) and writes a short summary for the teacher and the
 * student. Claude only ever receives text; the recording is never sent.
 */

/** Fewer lines than this = nothing worth summarizing (a test call, a no-show). */
const MIN_LINES = 6;
/** Keeps a very long class within one request (the end of the class is kept). */
const MAX_TRANSCRIPT_CHARS = 120_000;
const SUMMARY_MAX_TOKENS = 2500;
/** A summary still "pending" after this long is assumed lost and can be retried. */
const STALE_PENDING = sql`interval '10 minutes'`;

const ROLE_LABEL = { teacher: "Teacher", student: "Student", staff: "Staff", guest: "Guest" } as const;

/** `[mm:ss] Teacher (Ana): …` lines, timed from the first line of the class. */
export function transcriptForSummary(lines: ClassTranscriptLine[]) {
  const start = lines.length ? Date.parse(lines[0]!.at) : 0;
  const text = lines
    .map((line) => {
      const seconds = Math.max(0, Math.round((Date.parse(line.at) - start) / 1000));
      const stamp = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
      const role = line.speakerRole ? ROLE_LABEL[line.speakerRole] : "Speaker";
      return `[${stamp}] ${role} (${line.speakerName}): ${line.text}`;
    })
    .join("\n");
  return text.length > MAX_TRANSCRIPT_CHARS ? text.slice(text.length - MAX_TRANSCRIPT_CHARS) : text;
}

const SYSTEM = [
  "You summarize a live online Spanish class for an English-speaking student and their teacher.",
  "The transcript was made by speech recognition: ignore small recognition errors and filler words.",
  "Use only what is in the transcript; never invent content.",
  "Reply with ONLY a JSON object with two keys, \"en\" and \"es\": the same summary written in English and in Spanish.",
  "Each one has: overview (2-3 sentences on what the class covered), topics (up to 6 short items: themes and grammar),",
  "vocabulary (up to 12 objects {term, meaning}: Spanish words or phrases the student learned or needed; term stays in Spanish in both languages, meaning in that language),",
  "corrections (up to 6 objects {said, better}: things the STUDENT said in Spanish with a mistake, and the correct Spanish; empty if none),",
  "nextSteps (up to 4 short, concrete things to practice before the next class).",
].join(" ");

/** First JSON object in Claude's reply (it may wrap it in a code fence). */
function parseSummaryReply(text: string) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1)) as { en?: unknown; es?: unknown };
    const en = parseSummaryContent(parsed.en);
    const es = parseSummaryContent(parsed.es);
    return en || es ? { en: en ?? es!, es: es ?? en! } : null;
  } catch {
    return null;
  }
}

function costMicros(inputTokens: number, outputTokens: number) {
  return Math.round(inputTokens * env.AI_PRICE_INPUT_PER_MTOK + outputTokens * env.AI_PRICE_OUTPUT_PER_MTOK);
}

/**
 * Takes the class for summarizing, once: a new row, or one that failed, was
 * skipped (too few lines then) or has been pending too long. `again` also
 * redoes a finished summary (the teacher asked for it).
 */
async function claim(sessionId: string, again: boolean) {
  const redo = again ? sql`OR ${classSummaries.status} = 'ready'` : sql``;
  const rows = await db.execute(sql`
    INSERT INTO ${classSummaries} (session_id, status, updated_at)
    VALUES (${sessionId}, 'pending', now())
    ON CONFLICT (session_id) DO UPDATE SET status = 'pending', error = NULL, updated_at = now()
    WHERE ${classSummaries.status} IN ('failed', 'skipped')
       OR (${classSummaries.status} = 'pending' AND ${classSummaries.updatedAt} < now() - ${STALE_PENDING})
       ${redo}
    RETURNING session_id
  `);
  return rowsOf(rows).length > 0;
}

export function lessonSummariesEnabled() {
  return env.LESSON_SUMMARY_ENABLED && isAnthropicConfigured();
}

/** Writes the summary of a class from its transcript. Safe to call more than once. */
export async function summarizeLesson(sessionId: string, options: { again?: boolean } = {}) {
  if (!lessonSummariesEnabled()) return;
  if (!(await claim(sessionId, Boolean(options.again)))) return;

  const finish = (values: Partial<typeof classSummaries.$inferInsert>) =>
    db
      .update(classSummaries)
      .set({ ...values, updatedAt: new Date() })
      .where(eq(classSummaries.sessionId, sessionId));

  try {
    const lines = (await listTranscriptSegments(sessionId)).filter((line) => line.text.trim());
    if (lines.length < MIN_LINES) {
      await finish({ status: "skipped", lineCount: lines.length });
      return;
    }
    const reply = await callClaude({
      system: SYSTEM,
      messages: [{ role: "user", content: `Class transcript:\n\n${transcriptForSummary(lines)}` }],
      maxTokens: SUMMARY_MAX_TOKENS,
    });
    const content = parseSummaryReply(reply.text);
    const usage = {
      lineCount: lines.length,
      inputTokens: reply.inputTokens,
      outputTokens: reply.outputTokens,
      costMicros: costMicros(reply.inputTokens, reply.outputTokens),
    };
    if (!content) {
      await finish({ status: "failed", error: "Claude did not return a readable summary.", ...usage });
      return;
    }
    await finish({ status: "ready", contentEn: content.en, contentEs: content.es, error: null, ...usage });
  } catch (error) {
    console.error("[lesson-summary]", sessionId, error);
    await finish({ status: "failed", error: String(error instanceof Error ? error.message : error).slice(0, 500) });
  }
}

/**
 * Summarizes after the response is sent. `delayMs` gives the agent time to
 * send its last lines (used when the trigger is the room closing).
 */
export function scheduleLessonSummary(sessionId: string, delayMs = 0) {
  if (!lessonSummariesEnabled()) return;
  after(async () => {
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    await summarizeLesson(sessionId);
  });
}

/** The summary for the class page, in the viewer's language; null if they may not see the class. */
export async function getLessonSummary(
  actor: AuthSession,
  sessionId: string,
  locale: "en" | "es",
): Promise<LessonSummaryView | null> {
  if (!(await canWatchClass(actor, sessionId))) return null;
  const [row] = await db.select().from(classSummaries).where(eq(classSummaries.sessionId, sessionId)).limit(1);
  if (!row) return null;
  return {
    status: row.status,
    content: (locale === "es" ? row.contentEs : row.contentEn) ?? row.contentEn ?? row.contentEs ?? null,
    updatedAt: row.updatedAt.toISOString(),
  };
}
