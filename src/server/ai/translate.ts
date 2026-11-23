import { and, eq, isNull, sql } from "drizzle-orm";
import type { AuthSession } from "@/lib/auth-types";
import { callClaude, isAnthropicConfigured } from "@/server/ai/anthropic";
import { costMicros, failure, loadConversation, type AiResult } from "@/server/ai/conversations";
import { db } from "@/server/db";
import { aiConversations, aiMessages } from "@/server/db/schema";

/*
 * "Translate" in the chat and in Talk with Luna: the conversation's lines in
 * English. One model call translates every line that has no translation yet;
 * the result is saved, so each line is translated only once. Luna's 💡 tip
 * stays as it is (it shows the right Spanish). The cost is added to the
 * conversation, but not its tokens: translating never shortens a practice.
 */

const HELP_TOKEN = "[AYUDA]";
const MAX_LINES = 60;
const MAX_TOKENS = 2000;

/** The part of a line to translate: everything before Luna's 💡 tip. */
export function translatableBody(content: string) {
  const lines = content.split("\n");
  const tip = lines.findIndex((line) => line.trim().startsWith("💡"));
  return (tip >= 0 ? lines.slice(0, tip) : lines).join("\n").trim();
}

/** Reads the model's JSON array (tolerates a code fence around it). */
export function parseTranslations(text: string, expected: number): string[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start < 0 || end <= start) return null;
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(parsed) || parsed.length !== expected) return null;
    return parsed.map((item) => String(item ?? "").trim().slice(0, 2000));
  } catch {
    return null;
  }
}

export async function translateConversation(
  actor: AuthSession,
  conversationId: string,
): Promise<AiResult<Record<string, string>>> {
  if (!isAnthropicConfigured()) return { ok: false, error: "not_configured" };
  const loaded = await loadConversation(actor.userId, conversationId);
  if (!loaded) return { ok: false, error: "not_found" };

  const rows = await db
    .select({ id: aiMessages.id, content: aiMessages.content, translation: aiMessages.translation })
    .from(aiMessages)
    .where(eq(aiMessages.conversationId, conversationId));
  const done: Record<string, string> = {};
  for (const row of rows) if (row.translation) done[row.id] = row.translation;

  const missing = rows
    .filter((row) => !row.translation && row.content !== HELP_TOKEN && translatableBody(row.content))
    .slice(-MAX_LINES);
  if (!missing.length) return { ok: true, data: done };

  let reply;
  try {
    reply = await callClaude({
      system: [
        "Translate each Spanish line of a language-learning conversation into natural English.",
        "Keep names, numbers and emoji. Do not correct or explain anything.",
        `Reply with ONLY a JSON array of ${missing.length} strings, in the same order.`,
      ].join(" "),
      messages: [{ role: "user", content: JSON.stringify(missing.map((row) => translatableBody(row.content))) }],
      maxTokens: MAX_TOKENS,
    });
  } catch (error) {
    return { ok: false, error: failure(error) };
  }

  const translations = parseTranslations(reply.text, missing.length);
  if (!translations) return { ok: false, error: "ai_error" };

  await Promise.all(
    missing.map((row, index) =>
      db
        .update(aiMessages)
        .set({ translation: translations[index] })
        .where(and(eq(aiMessages.id, row.id), isNull(aiMessages.translation))),
    ),
  );
  await db
    .update(aiConversations)
    .set({ costMicros: sql`${aiConversations.costMicros} + ${costMicros(reply.inputTokens, reply.outputTokens)}` })
    .where(eq(aiConversations.id, conversationId));

  missing.forEach((row, index) => {
    done[row.id] = translations[index]!;
  });
  return { ok: true, data: done };
}
