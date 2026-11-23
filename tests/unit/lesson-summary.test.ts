import { describe, expect, it, vi } from "vitest";

vi.mock("@/env", () => ({ env: { LESSON_SUMMARY_ENABLED: true, AI_PRICE_INPUT_PER_MTOK: 1, AI_PRICE_OUTPUT_PER_MTOK: 5 } }));
vi.mock("@/server/db", () => ({ db: {} }));
vi.mock("next/server", () => ({ after: vi.fn() }));

const { transcriptForSummary } = await import("@/server/ai/lesson-summary");
const { parseSummaryContent } = await import("@/lib/lesson-summary");

const line = (at: string, role: "teacher" | "student" | null, name: string, text: string) => ({
  id: `${name}-${at}`,
  speakerIdentity: name,
  speakerName: name,
  speakerRole: role,
  text,
  lang: "multi",
  at,
});

describe("lesson summary", () => {
  it("writes the transcript as timed lines with the speaker's role", () => {
    const text = transcriptForSummary([
      line("2026-11-23T15:00:00.000Z", "teacher", "Ana", "¿Qué hiciste el fin de semana?"),
      line("2026-11-23T15:12:30.000Z", "student", "Alex", "Yo fui a the beach con mi familia."),
      line("2026-11-23T15:13:05.000Z", null, "Invitado", "Hola"),
    ]);
    expect(text.split("\n")).toEqual([
      "[00:00] Teacher (Ana): ¿Qué hiciste el fin de semana?",
      "[12:30] Student (Alex): Yo fui a the beach con mi familia.",
      "[13:05] Speaker (Invitado): Hola",
    ]);
  });

  it("reads one language of Claude's answer and drops incomplete items", () => {
    expect(
      parseSummaryContent({
        overview: "  Practicamos el pasado.  ",
        topics: ["Pretérito", "", 3],
        vocabulary: [{ term: "la playa", meaning: "the beach" }, { term: "sin significado" }],
        corrections: [{ said: "Yo fui a the beach", better: "Fui a la playa" }],
        nextSteps: ["Escribe 5 frases en pasado"],
      }),
    ).toEqual({
      overview: "Practicamos el pasado.",
      topics: ["Pretérito"],
      vocabulary: [{ term: "la playa", meaning: "the beach" }],
      corrections: [{ said: "Yo fui a the beach", better: "Fui a la playa" }],
      nextSteps: ["Escribe 5 frases en pasado"],
    });
    expect(parseSummaryContent({ topics: ["x"] })).toBeNull();
  });
});
