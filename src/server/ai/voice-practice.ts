import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { env } from "@/env";
import { VOICE_SCENARIO_PREFIX, VOICE_TOPICS, type AiVoiceFeedback, type AiVoiceState } from "@/lib/ai-practice";
import type { AuthSession } from "@/lib/auth-types";
import { callClaude, isAnthropicConfigured, streamClaude, type ClaudeMessage } from "@/server/ai/anthropic";
import { chargeConversation, refundConversation } from "@/server/ai/credits";
import {
  charsToTokens,
  lastFullSentence,
  conversationMessages,
  costMicros,
  failure,
  loadConversation,
  MAX_USER_CHARS,
  MIN_TOKENS_FOR_TURN,
  reportReserve,
  overDailyCap,
  VOICE_REPLY_MAX_TOKENS,
  VOICE_REPORT_MAX_TOKENS,
  aiRateLimited,
  withConversationLock,
  type AiResult,
  type ConversationRow,
} from "@/server/ai/conversations";
import { MAX_WORDS, parseFeedback } from "@/server/ai/voice-report";
import {
  customOpening,
  firstName,
  isVoiceTopic,
  VOICE_TOPIC_SETUP,
  voiceClosing,
  voiceGoals,
  voiceOpening,
  type VoiceGoal,
} from "@/server/ai/voice-topics";
import { getUserProfile } from "@/server/auth/user-repository";
import { db } from "@/server/db";
import { aiConversations, aiMessages, studentWords } from "@/server/db/schema";

/*
 * "Habla con la IA": Luna, a spoken practice in Spanish that works like a small agent.
 * - Starting is free: the greeting is fixed text.
 * - Each topic has goals; Luna follows the student's lead, comes back to the
 *   goals still open and says goodbye when they are covered (or on the last turn).
 * - Cheap turns: only the last few exchanges are sent, plus Luna's own short
 *   notes about the student and the goals done (she writes them in each reply).
 * - Fast: the reply streams, so the browser speaks each sentence as it arrives.
 * - At the end one call writes the report; its useful words go to the
 *   student's vocabulary. Tokens for the report are reserved from the start.
 */

/** Messages of recent context sent with each turn (4 exchanges). */
const VOICE_WINDOW = 8;
/** The practice wraps up after this many answers even if goals are open. */
const VOICE_MAX_ANSWERS = 10;
/** Answers needed before the student can end early and still get a report. */
export const VOICE_MIN_ANSWERS_FOR_REPORT = 2;
/** What the student "says" when they press Ayuda. */
export const VOICE_HELP = "[AYUDA]";

const EMPTY_STATE: AiVoiceState = { covered: [], notes: "" };

/** Sent with every turn: short on purpose. */
function voicePrompt(input: {
  about: string;
  level: string;
  goals: VoiceGoal[];
  state: AiVoiceState;
  lastTurn: boolean;
}) {
  const goals = input.goals
    .map((item) => `${item.key}: ${item.goal}${input.state.covered.includes(item.key) ? " [done]" : ""}`)
    .join("; ");
  return [
    `You are Luna, a warm Spanish conversation partner on a voice call with a native English speaker learning Spanish (${input.level} level). Topic: ${input.about}.`,
    `Speak only simple, natural Spanish for their level: 1-2 short sentences, no lists, no emojis or symbols (your words are read aloud).`,
    `Goals (key: goal): ${goals}.`,
    `What you know about the student: ${input.state.notes || "nothing yet"}.`,
    `Follow the student's lead if they take the talk somewhere new, then come back to goals not done. Ask ONE question at a time.`,
    `If their answer was too short, unclear or didn't answer you, kindly ask again for what was missing, in simpler words.`,
    `If the student writes ${VOICE_HELP} or doesn't understand, repeat your last question more simply and give the start of a possible answer ("Puedes decir: ...").`,
    input.lastTurn
      ? `This is the last turn: react briefly, thank them and say goodbye (no question).`
      : `When all goals are done, react briefly, thank them and say goodbye instead of asking.`,
    `After your spoken reply add exactly these lines:`,
    `SCORE: 0-5 (how complete and on-topic their last answer was; 0 for ${VOICE_HELP})`,
    `DONE: keys of all goals covered so far, comma-separated`,
    `NOTES: what you know about the student, max 25 words`,
    `END: yes if you said goodbye, otherwise no`,
  ].join("\n");
}

const TRAILER = /\s*SCORE\s*:/i;

/** Splits what Luna says from her bookkeeping lines (SCORE, DONE, NOTES, END). */
function parseVoiceReply(text: string, goals: VoiceGoal[]) {
  const cut = text.search(TRAILER);
  const trailer = cut >= 0 ? text.slice(cut) : "";
  const keys = new Set(goals.map((item) => item.key));
  return {
    spoken: (cut >= 0 ? text.slice(0, cut) : text).trim(),
    score: Number(trailer.match(/SCORE\s*:\s*([0-5])/i)?.[1] ?? 0),
    covered: (trailer.match(/DONE\s*:\s*([^\n]*)/i)?.[1] ?? "")
      .split(/[,\s]+/)
      .map((key) => key.trim().toLowerCase())
      .filter((key) => keys.has(key)),
    notes: (trailer.match(/NOTES\s*:\s*([^\n]*)/i)?.[1] ?? "").trim().slice(0, 300),
    end: /END\s*:\s*(yes|s[ií]|true)/i.test(trailer),
  };
}

const sumChars = (messages: { content: string }[]) =>
  messages.reduce((total, message) => total + message.content.length, 0);

/** Starts speaking practice with Luna on a suggested topic or the student's own. Free until they answer. */
export async function startVoicePractice(
  actor: AuthSession,
  input: { topicKey?: string; topic?: string; locale: "en" | "es" },
): Promise<AiResult<{ id: string }>> {
  if (!isAnthropicConfigured()) return { ok: false, error: "not_configured" };
  const preset = input.topicKey && isVoiceTopic(input.topicKey) ? input.topicKey : null;
  const custom = String(input.topic ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!preset && custom.length < 3) return { ok: false, error: "invalid" };
  if (await overDailyCap(actor.userId, "voice")) return { ok: false, error: "daily_limit" };
  if (await aiRateLimited(actor.userId, "startPerUser")) return { ok: false, error: "rate_limited" };
  const profile = await getUserProfile(actor.userId);
  const topic = preset ? VOICE_TOPICS.find((item) => item.key === preset)! : null;
  const id = `aic-${randomUUID()}`;
  const billing = await chargeConversation(actor.userId, "voice", id);
  if (!billing) return { ok: false, error: "no_credits" };
  try {
    await db.insert(aiConversations).values({
      id,
      userId: actor.userId,
      scenario: `${VOICE_SCENARIO_PREFIX}${preset ?? "custom"}`,
      mode: "voice",
      // What the model is told the conversation is about.
      topic: preset ? VOICE_TOPIC_SETUP[preset].about : custom,
      language: "spanish",
      level: profile?.level ?? "beginner",
      title: (topic ? topic.title[input.locale] : custom).slice(0, 120),
      tokenLimit: env.AI_CONVERSATION_TOKEN_LIMIT,
      voiceState: EMPTY_STATE,
      billing,
    });
    await db.insert(aiMessages).values({
      id: `aim-${randomUUID()}`,
      conversationId: id,
      role: "assistant",
      content: voiceOpening(firstName(actor.name), preset ? VOICE_TOPIC_SETUP[preset].opening : customOpening(custom)),
    });
  } catch (error) {
    await refundConversation(actor.userId, id, billing, "voice");
    throw error;
  }
  return { ok: true, data: { id } };
}

/**
 * One turn: the student's answer (or a request for help) goes in, Luna's reply
 * streams out through `onSpoken` (only the words to say aloud). Saves both,
 * updates goals and notes, and writes the report when Luna says goodbye.
 */
export async function voiceTurn(
  actor: AuthSession,
  input: { conversationId: string; text: string; help: boolean; locale: "en" | "es" },
  onSpoken: (piece: string) => void,
): Promise<AiResult<{ messageId: string; finished: boolean }>> {
  if (await aiRateLimited(actor.userId, "messagePerUser")) return { ok: false, error: "rate_limited" };
  return withConversationLock(actor.userId, String(input.conversationId ?? ""), () =>
    voiceTurnNow(actor, input, onSpoken),
  );
}

async function voiceTurnNow(
  actor: AuthSession,
  input: { conversationId: string; text: string; help: boolean; locale: "en" | "es" },
  onSpoken: (piece: string) => void,
): Promise<AiResult<{ messageId: string; finished: boolean }>> {
  if (!isAnthropicConfigured()) return { ok: false, error: "not_configured" };
  const text = input.help ? VOICE_HELP : String(input.text ?? "").trim().slice(0, MAX_USER_CHARS);
  if (!text) return { ok: false, error: "invalid" };

  const loaded = await loadConversation(actor.userId, input.conversationId);
  if (!loaded || loaded.row.mode !== "voice") return { ok: false, error: "not_found" };
  const conversation = loaded.row;
  if (conversation.status === "finished") return { ok: false, error: "finished" };

  const goals = voiceGoals(conversation.scenario);
  const state = conversation.voiceState ?? EMPTY_STATE;
  const previous = await conversationMessages(conversation.id);
  const answers = previous.filter((message) => message.role === "user").length + 1;

  // Only the last exchanges; Luna's notes and goals carry the rest.
  const recent = previous.slice(-VOICE_WINDOW);
  const history: ClaudeMessage[] = [
    // The API needs the first turn to be the user's; the window starts with Luna.
    ...(recent[0]?.role === "assistant" ? [{ role: "user" as const, content: "(start)" }] : []),
    ...recent.map((message) => ({ role: message.role, content: message.content })),
    { role: "user", content: text },
  ];

  // Budget: this turn, plus (if it isn't the last) one more, plus the report.
  const remaining = conversation.tokenLimit - conversation.tokensUsed;
  const reportNeed = reportReserve(sumChars(previous) + text.length + 400);
  const draftSystem = voicePrompt({ about: conversation.topic, level: conversation.level, goals, state, lastTurn: false });
  const turnCost = charsToTokens(draftSystem.length + sumChars(history)) + VOICE_REPLY_MAX_TOKENS;
  if (remaining - turnCost - reportNeed < 0) {
    return wrapUpVoice(actor, conversation, text, input.locale, onSpoken);
  }
  const lastTurn =
    answers >= VOICE_MAX_ANSWERS || remaining - 2 * turnCost - reportNeed < MIN_TOKENS_FOR_TURN;
  const system = lastTurn
    ? voicePrompt({ about: conversation.topic, level: conversation.level, goals, state, lastTurn })
    : draftSystem;

  // Stream only the spoken part: hold back a few characters so the start of
  // "SCORE:" is never sent, and stop at the bookkeeping lines.
  let raw = "";
  let sent = 0;
  let cut = -1;
  let reply;
  try {
    reply = await streamClaude({
      system,
      messages: history,
      maxTokens: VOICE_REPLY_MAX_TOKENS,
      onText: (piece) => {
        raw += piece;
        if (cut < 0) cut = raw.search(TRAILER);
        const limit = cut >= 0 ? cut : Math.max(sent, raw.length - 12);
        if (limit > sent) {
          onSpoken(raw.slice(sent, limit));
          sent = limit;
        }
      },
    });
  } catch (error) {
    return { ok: false, error: failure(error) };
  }
  const spokenEnd = cut >= 0 ? cut : raw.trimEnd().length;
  if (spokenEnd > sent) onSpoken(raw.slice(sent, spokenEnd));

  const parsed = parseVoiceReply(reply.text, goals);
  // Cut off before the bookkeeping lines: keep only the full sentences in the transcript.
  if (reply.stopReason === "max_tokens" && cut < 0) parsed.spoken = lastFullSentence(parsed.spoken);
  // Only the hidden trailer (SCORE/DONE…) and nothing to say: not saved, the student can answer again.
  if (!parsed.spoken) return { ok: false, error: "ai_error" };
  const useful = !input.help && parsed.score >= 3;
  const nextState: AiVoiceState = {
    covered: [...new Set([...state.covered, ...parsed.covered])],
    notes: parsed.notes || state.notes,
  };
  const finished = parsed.end || lastTurn;
  const messageId = `aim-${randomUUID()}`;
  await db.insert(aiMessages).values([
    { id: `aim-${randomUUID()}`, conversationId: conversation.id, role: "user", content: text },
    {
      id: messageId,
      conversationId: conversation.id,
      role: "assistant",
      content: parsed.spoken,
      inputTokens: reply.inputTokens,
      outputTokens: reply.outputTokens,
    },
  ]);
  await db
    .update(aiConversations)
    .set({
      tokensUsed: sql`${aiConversations.tokensUsed} + ${reply.inputTokens + reply.outputTokens}`,
      inputTokens: sql`${aiConversations.inputTokens} + ${reply.inputTokens}`,
      outputTokens: sql`${aiConversations.outputTokens} + ${reply.outputTokens}`,
      costMicros: sql`${aiConversations.costMicros} + ${costMicros(reply.inputTokens, reply.outputTokens)}`,
      validAnswers: sql`${aiConversations.validAnswers} + ${useful ? 1 : 0}`,
      infoPoints: sql`${aiConversations.infoPoints} + ${useful ? parsed.score : 0}`,
      voiceState: nextState,
      // Finished as soon as Luna says goodbye, even if the report call fails (it can be retried).
      status: finished ? "finished" : "active",
      updatedAt: new Date(),
    })
    .where(eq(aiConversations.id, conversation.id));

  if (finished) {
    const transcript = [...previous, { role: "user" as const, content: text }, { role: "assistant" as const, content: parsed.spoken }];
    await writeVoiceReport(actor.userId, conversation, transcript, input.locale);
  }
  return { ok: true, data: { messageId, finished } };
}

/** Out of budget: keep the answer, say the fixed goodbye and write the report. */
async function wrapUpVoice(
  actor: AuthSession,
  conversation: ConversationRow,
  text: string,
  locale: "en" | "es",
  onSpoken: (piece: string) => void,
): Promise<AiResult<{ messageId: string; finished: boolean }>> {
  await db
    .insert(aiMessages)
    .values({ id: `aim-${randomUUID()}`, conversationId: conversation.id, role: "user", content: text });
  const done = await finishVoicePractice(actor, { conversationId: conversation.id, locale });
  if (done.ok) onSpoken(done.data.closing);
  return { ok: true, data: { messageId: done.ok ? done.data.messageId : "", finished: true } };
}

/**
 * Ends the practice when the student asks for it (or the budget runs out) and
 * writes the report. Also retries a report that failed.
 */
export async function finishVoicePractice(
  actor: AuthSession,
  input: { conversationId: string; locale: "en" | "es" },
): Promise<AiResult<{ closing: string; messageId: string }>> {
  if (!isAnthropicConfigured()) return { ok: false, error: "not_configured" };
  const loaded = await loadConversation(actor.userId, input.conversationId);
  if (!loaded || loaded.row.mode !== "voice") return { ok: false, error: "not_found" };
  const conversation = loaded.row;
  if (conversation.feedback) return { ok: false, error: "finished" };

  const messages = await conversationMessages(conversation.id);
  const answers = messages.filter((message) => message.role === "user").length;
  if (answers < VOICE_MIN_ANSWERS_FOR_REPORT) return { ok: false, error: "invalid" };

  const closing = voiceClosing(firstName(actor.name));
  const messageId = `aim-${randomUUID()}`;
  if (conversation.status !== "finished") {
    await db.insert(aiMessages).values({ id: messageId, conversationId: conversation.id, role: "assistant", content: closing });
    // Finished now, so it can't take more answers even if the report call fails.
    await db
      .update(aiConversations)
      .set({ status: "finished", updatedAt: new Date() })
      .where(eq(aiConversations.id, conversation.id));
  }
  const report = await writeVoiceReport(actor.userId, conversation, messages, input.locale);
  if (!report.ok) return report;
  return { ok: true, data: { closing, messageId } };
}

/** Writes Luna's report with one call (tokens were reserved for it) and saves its words. */
async function writeVoiceReport(
  userId: string,
  conversation: ConversationRow,
  transcript: { role: "user" | "assistant"; content: string }[],
  locale: "en" | "es",
): Promise<AiResult<AiVoiceFeedback>> {
  const reportLanguage = locale === "es" ? "Spanish" : "English";
  const system = [
    `You are Luna, a Spanish teacher. Evaluate the student's spoken Spanish in this conversation (topic: ${conversation.topic}; they are a ${conversation.level} learner and a native English speaker).`,
    `Reply with ONLY a compact JSON object, no code fences: {"score": 0-100, "summary": "...", "strengths": ["..."], "improve": ["..."], "corrections": [{"original": "...", "better": "..."}], "words": [{"term": "...", "translation": "..."}]}.`,
    `Write summary (max 40 words), strengths and improve (at most 3 items each, max 12 words per item) in ${reportLanguage}: short and encouraging.`,
    `corrections: up to 4 sentences the student actually said that had mistakes, with a natural Spanish version.`,
    `words: up to ${MAX_WORDS} useful Spanish words or short phrases from this conversation worth reviewing (prefer ones the student missed or misused), with the English translation.`,
  ].join(" ");
  const text = transcript
    .map((message) =>
      message.role === "assistant"
        ? `Luna: ${message.content}`
        : `Student: ${message.content === VOICE_HELP ? "(asked for help)" : message.content}`,
    )
    .join("\n");
  let reply;
  try {
    reply = await callClaude({ system, messages: [{ role: "user", content: text }], maxTokens: VOICE_REPORT_MAX_TOKENS });
  } catch (error) {
    return { ok: false, error: failure(error) };
  }
  const feedback = parseFeedback(reply.text);
  await db
    .update(aiConversations)
    .set({
      feedback,
      status: "finished",
      tokensUsed: sql`${aiConversations.tokensUsed} + ${reply.inputTokens + reply.outputTokens}`,
      inputTokens: sql`${aiConversations.inputTokens} + ${reply.inputTokens}`,
      outputTokens: sql`${aiConversations.outputTokens} + ${reply.outputTokens}`,
      costMicros: sql`${aiConversations.costMicros} + ${costMicros(reply.inputTokens, reply.outputTokens)}`,
      updatedAt: new Date(),
    })
    .where(eq(aiConversations.id, conversation.id));
  await addWordsToVocabulary(userId, feedback.words ?? [], conversation.title);
  return { ok: true, data: feedback };
}

/** Adds the report's words to the student's vocabulary (skips words already there). */
async function addWordsToVocabulary(
  userId: string,
  words: { term: string; translation: string }[],
  practiceTitle: string,
) {
  const clean = words
    .map((word) => ({ term: word.term.trim().slice(0, 200), translation: word.translation.trim().slice(0, 300) }))
    .filter((word) => word.term);
  if (!clean.length) return;
  const existing = await db
    .select({ term: studentWords.term })
    .from(studentWords)
    .where(
      and(
        eq(studentWords.studentId, userId),
        inArray(
          sql<string>`lower(${studentWords.term})`,
          clean.map((word) => word.term.toLowerCase()),
        ),
      ),
    );
  const known = new Set(existing.map((row) => row.term.toLowerCase()));
  const fresh = clean.filter((word, index, all) => {
    const key = word.term.toLowerCase();
    return !known.has(key) && all.findIndex((other) => other.term.toLowerCase() === key) === index;
  });
  if (!fresh.length) return;
  await db.insert(studentWords).values(
    fresh.map((word) => ({
      id: `sw-${randomUUID()}`,
      studentId: userId,
      term: word.term,
      translation: word.translation,
      example: `Luna · ${practiceTitle}`.slice(0, 500),
    })),
  );
}
