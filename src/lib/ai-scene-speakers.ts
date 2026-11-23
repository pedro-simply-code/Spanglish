/**
 * Where each person's mouth is in the scene pictures (percent of width / height),
 * so the speech bubbles point at whoever is talking. Luna is always the one who
 * serves, sells or asks; the student is the other person. `side` is where the
 * bubble opens from the mouth. Keep in sync with drizzle/0025_ai_scenes_luna.sql.
 */
export type SceneSpeaker = { x: number; y: number; side: "left" | "right" };
export type SceneSpeakers = { luna: SceneSpeaker; student: SceneSpeaker };

export const SCENE_SPEAKERS: Record<string, SceneSpeakers> = {
  store: { luna: { x: 79.5, y: 41.7, side: "left" }, student: { x: 23.0, y: 62.1, side: "right" } },
  restaurant: { luna: { x: 75.0, y: 43.3, side: "left" }, student: { x: 27.0, y: 57.1, side: "right" } },
  airport: { luna: { x: 75.0, y: 41.7, side: "left" }, student: { x: 25.0, y: 58.8, side: "right" } },
  doctor: { luna: { x: 75.0, y: 41.7, side: "left" }, student: { x: 27.0, y: 56.2, side: "right" } },
  interview: { luna: { x: 73.0, y: 44.2, side: "left" }, student: { x: 27.0, y: 52.1, side: "right" } },
  smalltalk: { luna: { x: 67.0, y: 53.3, side: "right" }, student: { x: 37.5, y: 54.6, side: "left" } },
};

/** Custom topics (no picture): Luna on the right, the student on the left. */
export const DEFAULT_SPEAKERS: SceneSpeakers = {
  luna: { x: 72, y: 42, side: "left" },
  student: { x: 28, y: 62, side: "right" },
};

export function sceneSpeakers(scenario: string): SceneSpeakers {
  return SCENE_SPEAKERS[scenario] ?? DEFAULT_SPEAKERS;
}

/** Above this, a bubble would hide the scene: whole sentences are kept up to it. */
const MAX_CHARS = 220;

/**
 * The spoken part of a line (without Luna's 💡 tip) for a bubble. Long lines
 * keep whole sentences — the last ones, usually the question — never a cut word.
 * The full line is always in the chat next to the picture.
 */
export function bubbleText(content: string) {
  const lines = content.split("\n");
  const tip = lines.findIndex((line) => line.trim().startsWith("💡"));
  const body = (tip >= 0 ? lines.slice(0, tip) : lines).join(" ").replace(/\s+/g, " ").trim();
  if (body.length <= MAX_CHARS) return body;
  const sentences = body.match(/[^.!?…]+[.!?…]+["»”)]*\s*|[^.!?…]+$/g) ?? [body];
  let kept = "";
  for (const sentence of [...sentences].reverse()) {
    const next = `${sentence.trim()} ${kept}`.trim();
    if (next.length > MAX_CHARS && kept) break;
    kept = next;
  }
  return kept;
}
