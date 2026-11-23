/**
 * What Claude writes about a class once it ends, from the live transcript.
 * Stored once per class in English and Spanish; each person reads it in the
 * language of their interface. Spanish terms stay in Spanish in both.
 */
export type LessonSummaryContent = {
  /** Two or three sentences on what the class was about. */
  overview: string;
  /** Topics and grammar practiced. */
  topics: string[];
  /** New words or phrases: the Spanish term and its meaning. */
  vocabulary: { term: string; meaning: string }[];
  /** Things the student said that can be said better. */
  corrections: { said: string; better: string }[];
  /** What to practice before the next class. */
  nextSteps: string[];
};

export type LessonSummaryStatus = "pending" | "ready" | "failed" | "skipped";

export type LessonSummaryView = {
  status: LessonSummaryStatus;
  content: LessonSummaryContent | null;
  updatedAt: string;
};

/** Who said a transcript line, from their place in the class (not guessed from the voice). */
export type TranscriptSpeakerRole = "teacher" | "student" | "staff" | "guest";

export const TRANSCRIPT_SPEAKER_ROLES: readonly TranscriptSpeakerRole[] = ["teacher", "student", "staff", "guest"];

const asText = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const asList = (value: unknown) => (Array.isArray(value) ? value : []);

/** Reads one language of Claude's answer; null when it has no overview. */
export function parseSummaryContent(value: unknown): LessonSummaryContent | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const overview = asText(raw.overview, 1200);
  if (!overview) return null;
  return {
    overview,
    topics: asList(raw.topics).map((item) => asText(item, 200)).filter(Boolean).slice(0, 8),
    vocabulary: asList(raw.vocabulary)
      .map((item) => {
        const entry = (item ?? {}) as Record<string, unknown>;
        return { term: asText(entry.term, 120), meaning: asText(entry.meaning, 200) };
      })
      .filter((entry) => entry.term && entry.meaning)
      .slice(0, 15),
    corrections: asList(raw.corrections)
      .map((item) => {
        const entry = (item ?? {}) as Record<string, unknown>;
        return { said: asText(entry.said, 300), better: asText(entry.better, 300) };
      })
      .filter((entry) => entry.said && entry.better)
      .slice(0, 8),
    nextSteps: asList(raw.nextSteps).map((item) => asText(item, 240)).filter(Boolean).slice(0, 5),
  };
}
