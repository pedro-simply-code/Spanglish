"use server";

import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { getActorWithPermission } from "@/server/auth/session";
import {
  finishAiConversation,
  resumeAiConversation,
  sendAiMessage,
  startAiConversation,
} from "@/server/ai/conversations";
import { translateConversation } from "@/server/ai/translate";
import { finishVoicePractice, startVoicePractice } from "@/server/ai/voice-practice";

export type AiActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  finished?: boolean;
  /** The AI's reply, when sending a message. */
  reply?: string;
};

async function errorMessage(error: string) {
  const t = await getTranslations("student.ai.errors");
  return t(error as Parameters<typeof t>[0]);
}

export async function startAiConversationAction(input: {
  scenario: string;
  topic?: string;
}): Promise<AiActionResult> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: await errorMessage("forbidden") };
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const result = await startAiConversation(actor, { ...input, locale });
  if (!result.ok) return { ok: false, message: await errorMessage(result.error) };
  revalidatePath("/speak");
  revalidatePath("/chat");
  return { ok: true, message: "", id: result.data.id };
}

export async function sendAiMessageAction(input: {
  conversationId: string;
  text: string;
}): Promise<AiActionResult> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: await errorMessage("forbidden") };
  const result = await sendAiMessage(actor, input);
  if (!result.ok) return { ok: false, message: await errorMessage(result.error), finished: result.error === "finished" };
  return { ok: true, message: "", finished: result.data.finished, reply: result.data.reply };
}

export async function finishAiConversationAction(conversationId: string): Promise<AiActionResult> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: await errorMessage("forbidden") };
  await finishAiConversation(actor, conversationId);
  revalidatePath("/speak");
  revalidatePath("/chat");
  return { ok: true, message: "" };
}

export async function resumeAiConversationAction(conversationId: string): Promise<AiActionResult> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: await errorMessage("forbidden") };
  const result = await resumeAiConversation(actor, conversationId);
  if (!result.ok) return { ok: false, message: await errorMessage(result.error) };
  revalidatePath("/speak");
  revalidatePath("/chat");
  return { ok: true, message: "" };
}

export async function startVoicePracticeAction(input: {
  topicKey?: string;
  topic?: string;
}): Promise<AiActionResult> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: await errorMessage("forbidden") };
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const result = await startVoicePractice(actor, { ...input, locale });
  if (!result.ok) return { ok: false, message: await errorMessage(result.error) };
  revalidatePath("/speak");
  revalidatePath("/chat");
  return { ok: true, message: "", id: result.data.id };
}

/** Ends Luna's voice practice and writes the report (also retries a failed report). */
export async function finishVoicePracticeAction(conversationId: string): Promise<AiActionResult> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: await errorMessage("forbidden") };
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const result = await finishVoicePractice(actor, { conversationId, locale });
  if (!result.ok) {
    const key = result.error === "invalid" ? "voice_too_short" : result.error;
    return { ok: false, message: await errorMessage(key) };
  }
  revalidatePath("/speak");
  revalidatePath("/chat");
  return { ok: true, message: "", reply: result.data.closing, finished: true };
}

/** English version of the conversation's lines (translated once, then kept). */
export async function translateConversationAction(
  conversationId: string,
): Promise<{ ok: boolean; message: string; translations?: Record<string, string> }> {
  const actor = await getActorWithPermission("materials:read");
  if (!actor) return { ok: false, message: await errorMessage("forbidden") };
  const result = await translateConversation(actor, String(conversationId));
  if (!result.ok) return { ok: false, message: await errorMessage(result.error) };
  return { ok: true, message: "", translations: result.data };
}
