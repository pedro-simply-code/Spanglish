"use server";

import { revalidatePath } from "next/cache";
import { getActor } from "@/server/auth/session";
import {
  markMessageRead,
  sendAcademyMessage,
  toggleMessageImportant,
  toggleMessageStarred,
  trashMessage,
} from "@/server/messages/mailbox";
import { searchMessageRecipients, verifyMessageRecipient } from "@/server/messages/recipients";

export async function sendAcademyMessageAction(input: { toEmail: string; subject: string; body: string }) {
  const actor = await getActor();
  const result = await sendAcademyMessage(actor, input);
  if (result.ok) revalidatePath("/apps/email");
  return result;
}

export async function markMessageReadAction(messageId: string) {
  const actor = await getActor();
  await markMessageRead(actor.userId, messageId);
  revalidatePath("/apps/email");
  return { ok: true as const };
}

export async function toggleMessageStarredAction(messageId: string) {
  const actor = await getActor();
  await toggleMessageStarred(actor.userId, messageId);
  revalidatePath("/apps/email");
  return { ok: true as const };
}

export async function toggleMessageImportantAction(messageId: string) {
  const actor = await getActor();
  await toggleMessageImportant(actor.userId, messageId);
  revalidatePath("/apps/email");
  return { ok: true as const };
}

export async function trashMessageAction(messageId: string) {
  const actor = await getActor();
  await trashMessage(actor.userId, messageId);
  revalidatePath("/apps/email");
  return { ok: true as const };
}

export async function searchMessageRecipientsAction(query: string) {
  const actor = await getActor();
  return searchMessageRecipients(actor.userId, query);
}

export async function verifyMessageRecipientAction(email: string) {
  const actor = await getActor();
  return verifyMessageRecipient(actor.userId, email);
}