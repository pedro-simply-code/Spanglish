import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";
import { env } from "@/env";
import {
  CUSTOM_SCENARIO,
  VOICE_SCENARIO_PREFIX,
  type AiConversationDetail,
  type AiConversationSummary,
  type AiScenarioCard,
} from "@/lib/ai-practice";
import type { AuthSession } from "@/lib/auth-types";
import {
  callClaude,
  classifyClaudeError,
  isAnthropicConfigured,
  type ClaudeFailure,
  type ClaudeMessage,
} from "@/server/ai/anthropic";
import { chargeConversation, refundConversation } from "@/server/ai/credits";
import { aiRateLimitRules, checkRateLimits } from "@/server/auth/rate-limit";
import { readFeedback } from "@/server/ai/voice-report";
import { voiceEmoji, voiceGoals } from "@/server/ai/voice-topics";
import { getUserProfile } from "@/server/auth/user-repository";
import { db } from "@/server/db";
import { aiConversations, aiMessages, aiScenarios } from "@/server/db/schema";

/*
 * Role-play conversation practice with Claude.
 * - Starting is free: the first line and the picture come from `ai_scenarios`
 *   (set by hand), so tokens are spent only once the student replies.
 * - Each conversation has a budget (AI_CONVERSATION_TOKEN_LIMIT, input + output);
 *   it ends before a reply would go over.
 * - Each new conversation is free (from attended classes) or spends 1 AI
 *   credit (src/server/ai/credits.ts); AI_CONVERSATIONS_PER_DAY is an optional cap.
 * - Voice practice ("Habla con la IA", Luna) lives in voice-practice.ts and
 *   shares the listing, budget and storage helpers exported here.
 */

const LANGUAGE_NAMES = { spanish: "Spanish", english: "English" } as const;
type PracticeLanguage = keyof typeof LANGUAGE_NAMES;

/** First line for a custom topic (no model call). */
const CUSTOM_OPENINGS: Record<PracticeLanguage, (topic: string) => string> = {
  spanish: (topic) => `¡Hola! Hoy practicamos: «${topic}». Yo hago el otro papel. ¿Empiezas tú?`,
  english: (topic) => `Hi! Today we're practicing: "${topic}". I'll play the other role. Want to start?`,
};
const CUSTOM_EMOJI = "✨";

const REPLY_MAX_TOKENS = 400;
/** Below this many tokens left, the conversation wraps up. */
export const MIN_TOKENS_FOR_TURN = 400;
export const MAX_USER_CHARS = 500;
/** Rough size of the instructions sent with every reply, in characters. */
const SYSTEM_CHARS = 900;
/** Voice: Luna's spoken reply (1-2 sentences) plus her bookkeeping lines. */
export const VOICE_REPLY_MAX_TOKENS = 260;
export const VOICE_REPORT_MAX_TOKENS = 1000;
/** Voice: prompt with goals and notes, and the recent exchanges sent each turn. */
const VOICE_SYSTEM_CHARS = 1800;
const VOICE_WINDOW_CHARS = 2400;

export type AiResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      error:
        | "not_configured"
        | "daily_limit"
        | "no_credits"
        | "not_found"
        | "finished"
        | "invalid"
        | "busy"
        | "rate_limited"
        | ClaudeFailure;
    };

/** Logs the real API error on the server (never the key) and returns a UI reason. */
export function failure(error: unknown): ClaudeFailure {
  console.error("[ai-practice]", error instanceof Error ? error.message : error);
  return classifyClaudeError(error);
}

const svgDataUrl = (svg: string | null) =>
  svg ? `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}` : null;

const practiceLanguage = (value: string | null | undefined): PracticeLanguage =>
  value === "english" ? "english" : "spanish";

/** Short on purpose: it is sent with every reply. */
function systemPrompt(input: { role: string; scene: string; language: PracticeLanguage; level: string }) {
  const target = LANGUAGE_NAMES[input.language];
  const native = input.language === "spanish" ? "English" : "Spanish";
  return [
    `Role-play as ${input.role}. Scene: ${input.scene}. The learner is a ${input.level} learner of ${target}.`,
    `Always answer in character first: speak only ${target}, in 1-3 short sentences at their level, usually ending with a question.`,
    `Only if their last message has a real mistake (grammar, spelling or accents), add one final line: "💡 " followed by just the corrected ${target} sentence, nothing else. If it is correct, add no 💡 line. Never send only the 💡 line.`,
    `If they say they don't understand, explain briefly in ${native}. Stay in character, keep it suitable for all ages, and steer off-topic requests back to the scene.`,
  ].join(" ");
}

/**
 * When the reply hit the token cap, drops the sentence that was cut off: an
 * unfinished 💡 line goes away, otherwise the text ends at the last full sentence.
 */
export function withoutCutSentence(reply: string, stopReason: string | null) {
  if (stopReason !== "max_tokens") return reply;
  const lines = reply.split("\n");
  const tip = lines.findIndex((line) => line.trim().startsWith("💡"));
  if (tip > 0) return lines.slice(0, tip).join("\n").trim();
  return lastFullSentence(reply);
}

/** The text up to its last sentence ending (. ! ? …), or all of it if there is none. */
export function lastFullSentence(text: string) {
  const end = Math.max(...[".", "!", "?", "…"].map((mark) => text.lastIndexOf(mark)));
  return end > 0 ? text.slice(0, end + 1).trim() : text.trim();
}

/** What Luna says in the scene: the reply without its 💡 correction line. */
export function spokenPart(reply: string) {
  const lines = reply.split("\n");
  const tip = lines.findIndex((line) => line.trim().startsWith("💡"));
  return (tip >= 0 ? lines.slice(0, tip) : lines).join("\n").trim();
}

/** Cost of a call in millionths of a dollar at the configured model price. */
export function costMicros(inputTokens: number, outputTokens: number) {
  return Math.round(
    inputTokens * env.AI_PRICE_INPUT_PER_MTOK + outputTokens * env.AI_PRICE_OUTPUT_PER_MTOK,
  );
}

/** Rough token estimate for the request we are about to send. */
const estimateTokens = (texts: string[]) => Math.ceil(texts.join("").length / 3.5);
export const charsToTokens = (chars: number) => Math.ceil(chars / 3.5);

/** Tokens the voice report needs: the transcript plus a short answer. */
export const reportReserve = (historyChars: number) =>
  charsToTokens(historyChars + 800) + VOICE_REPORT_MAX_TOKENS;

/**
 * Whether one more reply fits: the next request resends the whole chat.
 * Voice practice also keeps enough for the final report.
 */
function hasTokensLeft(row: ConversationRow, historyChars: number) {
  if (row.mode === "voice") {
    // Voice sends only recent exchanges, but keeps the report's share.
    const nextRequest = charsToTokens(VOICE_SYSTEM_CHARS + Math.min(historyChars, VOICE_WINDOW_CHARS) + MAX_USER_CHARS);
    return row.tokenLimit - row.tokensUsed - nextRequest - reportReserve(historyChars) >= MIN_TOKENS_FOR_TURN;
  }
  const nextRequest = charsToTokens(SYSTEM_CHARS + historyChars + MAX_USER_CHARS);
  return row.tokenLimit - row.tokensUsed - nextRequest >= MIN_TOKENS_FOR_TURN;
}

export function aiPracticeConfig() {
  return {
    configured: isAnthropicConfigured(),
    tokenLimit: env.AI_CONVERSATION_TOKEN_LIMIT,
    perDay: env.AI_CONVERSATIONS_PER_DAY,
    model: env.ANTHROPIC_MODEL,
  };
}

/** Active scenes for the picker, in order. */
export async function listAiScenarios(): Promise<AiScenarioCard[]> {
  const rows = await db
    .select()
    .from(aiScenarios)
    .where(eq(aiScenarios.active, true))
    .orderBy(asc(aiScenarios.sortOrder));
  return rows.map((row) => ({
    key: row.key,
    emoji: row.emoji,
    title: row.title,
    description: row.description,
    sceneDataUrl: svgDataUrl(row.sceneSvg),
  }));
}

/** Optional safety cap (AI_CONVERSATIONS_PER_DAY, 0 = off) on new conversations per day and practice. */
export async function overDailyCap(userId: string, mode: "chat" | "voice") {
  if (env.AI_CONVERSATIONS_PER_DAY <= 0) return false;
  return (await startedToday(userId, mode)) >= env.AI_CONVERSATIONS_PER_DAY;
}

/** Practices started in the last 24 h; voice and chat have separate allowances. */
export async function startedToday(userId: string, mode: "chat" | "voice") {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(aiConversations)
    .where(
      and(
        eq(aiConversations.userId, userId),
        eq(aiConversations.mode, mode),
        gte(aiConversations.createdAt, since),
      ),
    );
  return row?.count ?? 0;
}

export type ConversationRow = typeof aiConversations.$inferSelect;
type ScenarioRow = typeof aiScenarios.$inferSelect;

function toSummary(
  row: ConversationRow,
  scenario: ScenarioRow | undefined,
  historyChars: number,
): AiConversationSummary {
  return {
    id: row.id,
    scenario: row.scenario,
    emoji: row.mode === "voice" ? voiceEmoji(row.scenario) : (scenario?.emoji ?? CUSTOM_EMOJI),
    title: row.title,
    language: row.language,
    status: row.status,
    mode: row.mode,
    tokensUsed: row.tokensUsed,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    costUsd: row.costMicros / 1_000_000,
    tokenLimit: row.tokenLimit,
    hasTokensLeft: hasTokensLeft(row, historyChars),
    goalsDone: row.voiceState?.covered.length ?? 0,
    goalsTotal: row.mode === "voice" ? voiceGoals(row.scenario).length : 0,
    hasFeedback: row.feedback !== null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function scenariosByKey(keys: string[]) {
  const unique = [
    ...new Set(keys.filter((key) => key !== CUSTOM_SCENARIO && !key.startsWith(VOICE_SCENARIO_PREFIX))),
  ];
  const rows = unique.length
    ? await db.select().from(aiScenarios).where(inArray(aiScenarios.key, unique))
    : [];
  return new Map(rows.map((row) => [row.key, row]));
}

/** One practice's history ("chat" or "voice"): they never mix. */
export async function listAiConversations(userId: string, mode: "chat" | "voice", limit = 30) {
  const rows = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.userId, userId), eq(aiConversations.mode, mode)))
    .orderBy(desc(aiConversations.createdAt))
    .limit(limit);
  const ids = rows.map((row) => row.id);
  const [scenarios, sizes] = await Promise.all([
    scenariosByKey(rows.map((row) => row.scenario)),
    ids.length
      ? db
          .select({
            conversationId: aiMessages.conversationId,
            chars: sql<number>`coalesce(sum(length(${aiMessages.content})), 0)::int`,
          })
          .from(aiMessages)
          .where(inArray(aiMessages.conversationId, ids))
          .groupBy(aiMessages.conversationId)
      : Promise.resolve([]),
  ]);
  const charsById = new Map(sizes.map((size) => [size.conversationId, size.chars]));
  return {
    conversations: rows.map((row) =>
      toSummary(row, scenarios.get(row.scenario), charsById.get(row.id) ?? 0),
    ),
    startedToday: await startedToday(userId, mode),
  };
}

export async function loadConversation(userId: string, id: string) {
  const [row] = await db
    .select()
    .from(aiConversations)
    .where(and(eq(aiConversations.id, id), eq(aiConversations.userId, userId)))
    .limit(1);
  if (!row) return null;
  const scenario = (await scenariosByKey([row.scenario])).get(row.scenario);
  return { row, scenario };
}

export async function getAiConversation(userId: string, id: string): Promise<AiConversationDetail | null> {
  const loaded = await loadConversation(userId, id);
  if (!loaded) return null;
  const messages = await db
    .select()
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, id))
    .orderBy(asc(aiMessages.createdAt));
  const historyChars = messages.reduce((total, message) => total + message.content.length, 0);
  return {
    ...toSummary(loaded.row, loaded.scenario, historyChars),
    topic: loaded.row.topic,
    sceneDataUrl: svgDataUrl(loaded.scenario?.sceneSvg ?? null),
    // Empty replies saved before the fix are hidden (the next turn skips them too).
    messages: messages.filter((message) => message.content.trim()).map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      translation: message.translation,
      createdAt: message.createdAt.toISOString(),
    })),
    feedback: readFeedback(loaded.row.feedback ?? null),
  };
}

/** Opening a conversation: chats while they have tokens; voice practice always (to read the report). */
export function canOpenAiConversation(conversation: AiConversationSummary) {
  return conversation.mode === "voice" || conversation.hasTokensLeft;
}

/** Starts a conversation without calling the model: 0 tokens until the student replies. */
export async function startAiConversation(
  actor: AuthSession,
  input: { scenario: string; topic?: string; locale: "en" | "es" },
): Promise<AiResult<{ id: string }>> {
  if (!isAnthropicConfigured()) return { ok: false, error: "not_configured" };
  const topic = String(input.topic ?? "").trim().slice(0, 200);
  const custom = input.scenario === CUSTOM_SCENARIO;
  if (custom && topic.length < 3) return { ok: false, error: "invalid" };

  const scenario = custom ? undefined : (await scenariosByKey([input.scenario])).get(input.scenario);
  if (!custom && (!scenario || !scenario.active)) return { ok: false, error: "invalid" };
  if (await overDailyCap(actor.userId, "chat")) return { ok: false, error: "daily_limit" };
  if (await aiRateLimited(actor.userId, "startPerUser")) return { ok: false, error: "rate_limited" };

  const profile = await getUserProfile(actor.userId);
  // Students are English speakers learning Spanish: the practice is always in Spanish.
  const language: PracticeLanguage = "spanish";
  const opening = scenario ? scenario.openings[language] : CUSTOM_OPENINGS[language](topic);

  const id = `aic-${randomUUID()}`;
  const billing = await chargeConversation(actor.userId, "chat", id);
  if (!billing) return { ok: false, error: "no_credits" };
  try {
    await db.insert(aiConversations).values({
      id,
      userId: actor.userId,
      scenario: input.scenario,
      topic,
      language,
      level: profile?.level ?? "beginner",
      title: (scenario ? scenario.title[input.locale] : topic).slice(0, 120),
      tokenLimit: env.AI_CONVERSATION_TOKEN_LIMIT,
      billing,
    });
    await db.insert(aiMessages).values({
      id: `aim-${randomUUID()}`,
      conversationId: id,
      role: "assistant",
      content: opening,
    });
  } catch (error) {
    await refundConversation(actor.userId, id, billing, "chat");
    throw error;
  }
  return { ok: true, data: { id } };
}

export async function conversationMessages(conversationId: string) {
  return db
    .select({ role: aiMessages.role, content: aiMessages.content })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId))
    .orderBy(asc(aiMessages.createdAt));
}

/** Whether this user is over a Luna limit (messages a minute, new conversations or translations an hour). */
export async function aiRateLimited(userId: string, kind: keyof typeof aiRateLimitRules) {
  const result = await checkRateLimits([{ key: `ai:${kind}:${userId}`, rule: aiRateLimitRules[kind] }]);
  return !result.allowed;
}

/** Longest a turn may hold the conversation (a crashed request frees it after this). */
const TURN_LOCK = sql`interval '90 seconds'`;

/**
 * Runs one turn while holding the conversation: a second send (another tab, a
 * double click) gets "busy" instead of passing the token check at the same
 * time and adding a second reply.
 */
export async function withConversationLock<T>(
  userId: string,
  conversationId: string,
  turn: () => Promise<AiResult<T>>,
): Promise<AiResult<T>> {
  const taken = await db
    .update(aiConversations)
    .set({ busyUntil: sql`now() + ${TURN_LOCK}` })
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, userId),
        or(isNull(aiConversations.busyUntil), lt(aiConversations.busyUntil, sql`now()`)),
      ),
    )
    .returning({ id: aiConversations.id });
  if (!taken.length) {
    const [exists] = await db
      .select({ id: aiConversations.id })
      .from(aiConversations)
      .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, userId)))
      .limit(1);
    return { ok: false, error: exists ? "busy" : "not_found" };
  }
  try {
    return await turn();
  } finally {
    await db.update(aiConversations).set({ busyUntil: null }).where(eq(aiConversations.id, conversationId));
  }
}

export async function sendAiMessage(
  actor: AuthSession,
  input: { conversationId: string; text: string },
): Promise<AiResult<{ finished: boolean; reply: string }>> {
  if (await aiRateLimited(actor.userId, "messagePerUser")) return { ok: false, error: "rate_limited" };
  return withConversationLock(actor.userId, String(input.conversationId ?? ""), () => sendAiMessageNow(actor, input));
}

async function sendAiMessageNow(
  actor: AuthSession,
  input: { conversationId: string; text: string },
): Promise<AiResult<{ finished: boolean; reply: string }>> {
  if (!isAnthropicConfigured()) return { ok: false, error: "not_configured" };
  const text = String(input.text ?? "").trim().slice(0, MAX_USER_CHARS);
  if (!text) return { ok: false, error: "invalid" };

  const loaded = await loadConversation(actor.userId, input.conversationId);
  // Voice practice has its own streaming turn (voice-practice.ts).
  if (!loaded || loaded.row.mode !== "chat") return { ok: false, error: "not_found" };
  const { row: conversation, scenario } = loaded;
  if (conversation.status === "finished") return { ok: false, error: "finished" };

  const system = systemPrompt({
    role: scenario?.role ?? "a friendly conversation partner who plays the right role",
    scene: scenario?.scene ?? conversation.topic,
    language: practiceLanguage(conversation.language),
    level: conversation.level,
  });
  const previous = await conversationMessages(conversation.id);
  // The API needs the first turn to be the user's; the opening is the AI's.
  const history: ClaudeMessage[] = [
    { role: "user", content: "(start)" },
    ...previous.map((message) => ({ role: message.role, content: message.content })),
    { role: "user", content: text },
  ];

  // Stop before the budget would be exceeded.
  const remaining = conversation.tokenLimit - conversation.tokensUsed;
  const estimate = estimateTokens([system, ...history.map((message) => message.content)]);
  if (remaining - estimate < MIN_TOKENS_FOR_TURN) {
    await db
      .update(aiConversations)
      .set({ status: "finished", updatedAt: new Date() })
      .where(eq(aiConversations.id, conversation.id));
    return { ok: false, error: "finished" };
  }

  // A reply with only the 💡 line (nothing said in the scene) breaks the flow:
  // asked once more; if it happens again nothing is saved and the student can resend.
  let reply;
  let spentInput = 0;
  let spentOutput = 0;
  try {
    for (let attempt = 1; ; attempt++) {
      reply = await callClaude({ system, messages: history, maxTokens: REPLY_MAX_TOKENS });
      spentInput += reply.inputTokens;
      spentOutput += reply.outputTokens;
      if (spokenPart(reply.text)) break;
      if (attempt >= 2) return { ok: false, error: "ai_error" };
    }
  } catch (error) {
    return { ok: false, error: failure(error) };
  }
  reply = {
    ...reply,
    text: withoutCutSentence(reply.text, reply.stopReason),
    inputTokens: spentInput,
    outputTokens: spentOutput,
  };

  const used = conversation.tokensUsed + reply.inputTokens + reply.outputTokens;
  // Ends when the next reply would not fit (same rule the list uses to allow opening it).
  const historyChars = previous.reduce((total, message) => total + message.content.length, 0);
  const finished = !hasTokensLeft({ ...conversation, tokensUsed: used }, historyChars + text.length + reply.text.length);
  await db.insert(aiMessages).values([
    { id: `aim-${randomUUID()}`, conversationId: conversation.id, role: "user", content: text },
    {
      id: `aim-${randomUUID()}`,
      conversationId: conversation.id,
      role: "assistant",
      content: reply.text,
      inputTokens: reply.inputTokens,
      outputTokens: reply.outputTokens,
    },
  ]);
  await db
    .update(aiConversations)
    .set({
      tokensUsed: used,
      inputTokens: sql`${aiConversations.inputTokens} + ${reply.inputTokens}`,
      outputTokens: sql`${aiConversations.outputTokens} + ${reply.outputTokens}`,
      costMicros: sql`${aiConversations.costMicros} + ${costMicros(reply.inputTokens, reply.outputTokens)}`,
      status: finished ? "finished" : "active",
      updatedAt: new Date(),
    })
    .where(eq(aiConversations.id, conversation.id));
  return { ok: true, data: { finished, reply: reply.text } };
}

/** Reopens a conversation the student ended, if it still has tokens for a reply. */
export async function resumeAiConversation(
  actor: AuthSession,
  conversationId: string,
): Promise<AiResult> {
  const conversation = await getAiConversation(actor.userId, conversationId);
  if (!conversation || conversation.mode !== "chat") return { ok: false, error: "not_found" };
  if (!conversation.hasTokensLeft) return { ok: false, error: "finished" };
  await db
    .update(aiConversations)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(eq(aiConversations.id, conversationId), eq(aiConversations.userId, actor.userId)));
  return { ok: true, data: undefined };
}

/** Closes a chat for now (voice practice ends with finishVoicePractice, which writes the report). */
export async function finishAiConversation(actor: AuthSession, conversationId: string) {
  await db
    .update(aiConversations)
    .set({ status: "finished", updatedAt: new Date() })
    .where(
      and(
        eq(aiConversations.id, conversationId),
        eq(aiConversations.userId, actor.userId),
        eq(aiConversations.mode, "chat"),
      ),
    );
}
