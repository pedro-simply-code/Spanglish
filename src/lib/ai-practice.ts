/** AI conversation practice: shared by the server and the student UI. */

/** Scenario key for a topic the student writes. */
export const CUSTOM_SCENARIO = "custom";

/** Voice practice with Luna: `scenario` is `luna-<topic key>` (or `luna-custom`). */
export const VOICE_SCENARIO_PREFIX = "luna-";

/** Topics Luna suggests; the student can also write their own. */
export const VOICE_TOPICS = [
  { key: "intro", emoji: "👋", title: { es: "Preséntate", en: "Introduce yourself" } },
  { key: "daily", emoji: "☀️", title: { es: "Tu día a día", en: "Your daily routine" } },
  { key: "food", emoji: "🌮", title: { es: "Comida", en: "Food" } },
  { key: "travel", emoji: "✈️", title: { es: "Viajes", en: "Travel" } },
  { key: "family", emoji: "👨‍👩‍👧", title: { es: "Tu familia", en: "Your family" } },
  { key: "job", emoji: "💼", title: { es: "Entrevista de trabajo", en: "Job interview" } },
] as const;

export type VoiceTopicKey = (typeof VOICE_TOPICS)[number]["key"];

/** What Luna keeps between turns instead of resending the whole conversation. */
export type AiVoiceState = {
  /** Goal keys the student already covered (see the topic's goals on the server). */
  covered: string[];
  /** Short notes about the student written by Luna (name, interests…). */
  notes: string;
};

/** Luna's report at the end of a voice practice. */
export type AiVoiceFeedback = {
  /** 0-100. */
  score: number;
  summary: string;
  strengths: string[];
  improve: string[];
  /** Sentences the student said and a better way to say them. */
  corrections: { original: string; better: string }[];
  /** Useful Spanish words from the practice (added to the student's vocabulary). */
  words?: { term: string; translation: string }[];
};

/** A scene card (from the `ai_scenarios` table). */
export type AiScenarioCard = {
  key: string;
  emoji: string;
  title: { en: string; es: string };
  description: { en: string; es: string };
  sceneDataUrl: string | null;
};

export type AiConversationSummary = {
  id: string;
  scenario: string;
  emoji: string;
  title: string;
  language: string;
  status: "active" | "finished";
  mode: "chat" | "voice";
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  /** What the conversation cost so far, in US dollars. */
  costUsd: number;
  tokenLimit: number;
  /** Enough tokens left for another reply: it can be opened and resumed. */
  hasTokensLeft: boolean;
  /** Voice practice: topic goals covered so far, out of the total. */
  goalsDone: number;
  goalsTotal: number;
  /** Voice practice finished with a report (it can always be opened to read it). */
  hasFeedback: boolean;
  createdAt: string;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** English version (null until the student asks for it). */
  translation: string | null;
  createdAt: string;
};

export type AiConversationDetail = AiConversationSummary & {
  topic: string;
  /** The scene picture as a data: URL (rendered in an <img>, so no script can run). */
  sceneDataUrl: string | null;
  messages: AiChatMessage[];
  feedback: AiVoiceFeedback | null;
};
