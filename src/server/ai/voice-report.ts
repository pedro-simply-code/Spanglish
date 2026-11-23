import type { AiVoiceFeedback } from "@/lib/ai-practice";

/*
 * Luna's report comes back as JSON. Models sometimes wrap it in ``` fences or
 * get cut off by the token limit, so this reads whatever arrived and never
 * shows raw JSON to the student.
 */

/** Words from a report that go into the student's vocabulary. */
export const MAX_WORDS = 5;

const asStrings = (value: unknown, max: number) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string" && item.trim() !== "").slice(0, max)
    : [];

const unescapeJson = (value: string) => {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value;
  }
};

/** Pulls the fields out of a report that is cut off or not valid JSON. */
function salvageFeedback(text: string): AiVoiceFeedback {
  const STRING = '"((?:[^"\\\\]|\\\\.)*)"';
  const field = (key: string) => text.match(new RegExp(`"${key}"\\s*:\\s*${STRING}`))?.[1];
  const list = (key: string) => {
    const block = text.match(new RegExp(`"${key}"\\s*:\\s*\\[([\\s\\S]*?)(?:\\]|$)`))?.[1] ?? "";
    return [...block.matchAll(new RegExp(STRING, "g"))].map((match) => unescapeJson(match[1]!)).slice(0, 3);
  };
  const corrections = [
    ...text.matchAll(new RegExp(`"original"\\s*:\\s*${STRING}\\s*,\\s*"better"\\s*:\\s*${STRING}`, "g")),
  ]
    .slice(0, 4)
    .map((match) => ({ original: unescapeJson(match[1]!), better: unescapeJson(match[2]!) }));
  const summary = field("summary");
  const words = [
    ...text.matchAll(new RegExp(`"term"\\s*:\\s*${STRING}\\s*,\\s*"translation"\\s*:\\s*${STRING}`, "g")),
  ]
    .slice(0, MAX_WORDS)
    .map((match) => ({ term: unescapeJson(match[1]!), translation: unescapeJson(match[2]!) }));
  return {
    score: Math.max(0, Math.min(100, Number(text.match(/"score"\s*:\s*(\d+)/)?.[1] ?? 0))),
    // No JSON at all: the model wrote plain text, show it as the summary.
    summary: summary ? unescapeJson(summary) : text.includes("{") ? "" : text.trim(),
    strengths: list("strengths"),
    improve: list("improve"),
    corrections,
    words,
  };
}

/** Reads the report JSON (also inside ``` fences, or cut off by the token limit). */
export function parseFeedback(text: string): AiVoiceFeedback {
  const cleaned = text.replace(/```(?:json)?/gi, "").trim();
  try {
    const json = JSON.parse(cleaned.slice(cleaned.indexOf("{"), cleaned.lastIndexOf("}") + 1)) as Record<
      string,
      unknown
    >;
    const corrections = Array.isArray(json.corrections) ? json.corrections : [];
    const words = Array.isArray(json.words) ? json.words : [];
    return {
      score: Math.max(0, Math.min(100, Math.round(Number(json.score) || 0))),
      summary: typeof json.summary === "string" ? json.summary : "",
      strengths: asStrings(json.strengths, 3),
      improve: asStrings(json.improve, 3),
      corrections: corrections
        .map((item) => item as { original?: unknown; better?: unknown })
        .filter((item) => typeof item.original === "string" && typeof item.better === "string")
        .slice(0, 4)
        .map((item) => ({ original: String(item.original), better: String(item.better) })),
      words: words
        .map((item) => item as { term?: unknown; translation?: unknown })
        .filter((item) => typeof item.term === "string" && item.term.trim() !== "")
        .slice(0, MAX_WORDS)
        .map((item) => ({ term: String(item.term).trim(), translation: String(item.translation ?? "").trim() })),
    };
  } catch {
    return salvageFeedback(cleaned);
  }
}

/** Reports saved before the parser handled fences or cut-off JSON hold the raw text. */
export function readFeedback(feedback: AiVoiceFeedback | null) {
  if (!feedback) return null;
  const raw = feedback.summary.trim();
  const looksRaw = !feedback.strengths.length && !feedback.improve.length && /^(```|\{)/.test(raw);
  return looksRaw ? parseFeedback(raw) : feedback;
}
