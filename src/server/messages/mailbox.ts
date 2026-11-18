import "server-only";

import { randomUUID } from "node:crypto";
import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, isNull, or, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { connection } from "next/server";
import type { Email } from "@/features/email";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import { academyMessages, users } from "@/server/db/schema";

const MAX_SUBJECT = 200;
const MAX_BODY = 20_000;

type AppsTranslator = Awaited<ReturnType<typeof getTranslations<"apps">>>;

/** Persists a message in /apps/email only (never SMTP/Postmark). */
export async function insertPlatformMessage(input: {
  senderUserId: string;
  recipientUserId: string;
  subject: string;
  body: string;
}) {
  const id = randomUUID();
  await db.insert(academyMessages).values({
    id,
    senderUserId: input.senderUserId,
    recipientUserId: input.recipientUserId,
    subject: input.subject.slice(0, MAX_SUBJECT),
    body: input.body.slice(0, MAX_BODY),
    externalDelivered: false,
  });
  return id;
}

function escapeHtml(text: string) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

const URL_IN_TEXT =
  /(\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\"']|\b\/(?:apply|join\/manager)(?:\?[^\s<]*)?)/g;

function linkifyEscapedText(escaped: string) {
  return escaped.replace(URL_IN_TEXT, (raw) => {
    const safeHref = escapeHtml(raw);
    return `<a href="${safeHref}" rel="noopener noreferrer" style="color:inherit;text-decoration:underline">${raw}</a>`;
  });
}

function bodyToHtml(body: string) {
  return body
    .split(/\n{2,}/)
    .map((paragraph) => {
      const escaped = escapeHtml(paragraph).replaceAll("\n", "<br/>");
      return `<p>${linkifyEscapedText(escaped)}</p>`;
    })
    .join("");
}

type MessageRow = {
  id: string;
  subject: string;
  body: string;
  createdAt: Date;
  readAt: Date | null;
  starredByRecipient: boolean;
  importantByRecipient: boolean;
  senderTrashedAt: Date | null;
  recipientTrashedAt: Date | null;
  externalDelivered: boolean;
  senderId: string;
  senderName: string;
  senderEmail: string;
  senderImage: string | null;
  recipientId: string;
  recipientName: string;
  recipientEmail: string;
};

async function fetchRowsForUser(userId: string): Promise<MessageRow[]> {
  const sender = alias(users, "message_sender");
  const recipient = alias(users, "message_recipient");

  return db
    .select({
      id: academyMessages.id,
      subject: academyMessages.subject,
      body: academyMessages.body,
      createdAt: academyMessages.createdAt,
      readAt: academyMessages.readAt,
      starredByRecipient: academyMessages.starredByRecipient,
      importantByRecipient: academyMessages.importantByRecipient,
      senderTrashedAt: academyMessages.senderTrashedAt,
      recipientTrashedAt: academyMessages.recipientTrashedAt,
      externalDelivered: academyMessages.externalDelivered,
      senderId: academyMessages.senderUserId,
      senderName: sender.name,
      senderEmail: sender.email,
      senderImage: sender.image,
      recipientId: academyMessages.recipientUserId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
    })
    .from(academyMessages)
    .innerJoin(sender, eq(academyMessages.senderUserId, sender.id))
    .innerJoin(recipient, eq(academyMessages.recipientUserId, recipient.id))
    .where(or(eq(academyMessages.senderUserId, userId), eq(academyMessages.recipientUserId, userId)))
    .orderBy(desc(academyMessages.createdAt))
    .limit(250);
}

async function rowToEmail(row: MessageRow, viewerId: string, t: AppsTranslator): Promise<Email> {
  const isInbox = row.recipientId === viewerId;
  const isSent = row.senderId === viewerId;
  const trashed = isInbox
    ? Boolean(row.recipientTrashedAt)
    : isSent
      ? Boolean(row.senderTrashedAt)
      : false;

  const counterpartName = isInbox ? row.senderName : row.recipientName;
  const counterpartEmail = isInbox ? row.senderEmail : row.recipientEmail;

  return {
    id: row.id,
    from: isSent ? t("email.prefix.to", { name: row.recipientName }) : row.senderName,
    thumbnail: isInbox ? row.senderImage ?? "" : "",
    subject: row.subject,
    time: row.createdAt,
    To: isInbox ? t("email.prefix.from", { email: row.senderEmail }) : row.recipientEmail,
    emailExcerpt: row.body.slice(0, 120),
    emailContent: bodyToHtml(row.body),
    unread: isInbox && !row.readAt,
    attachment: false,
    starred: isInbox && row.starredByRecipient,
    important: isInbox && row.importantByRecipient,
    inbox: isInbox && !row.recipientTrashedAt,
    sent: isSent && !row.senderTrashedAt,
    draft: false,
    spam: false,
    trash: trashed,
    label: "Academy",
    attachments: [],
    checked: false,
    mailbox: isInbox ? "inbox" : "sent",
    counterpartEmail,
    counterpartName,
  };
}

export async function listMailboxForUser(userId: string): Promise<Email[]> {
  await connection();
  const rows = await fetchRowsForUser(userId);
  const t = await getTranslations("apps");
  return Promise.all(rows.map((row) => rowToEmail(row, userId, t)));
}

export async function sendAcademyMessage(
  actor: AuthSession,
  input: { toEmail: string; subject: string; body: string },
) {
  const t = await getTranslations("apps");
  const toEmail = input.toEmail.trim().toLowerCase();
  const subject = input.subject.trim().slice(0, MAX_SUBJECT);
  const body = input.body.trim().slice(0, MAX_BODY);

  if (!toEmail.includes("@")) return { ok: false as const, message: t("email.errors.invalidRecipient") };
  if (subject.length < 1) return { ok: false as const, message: t("email.errors.subjectRequired") };
  if (body.length < 1) return { ok: false as const, message: t("email.errors.bodyRequired") };

  const recipient = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${toEmail}`)
    .limit(1);
  const recipientRow = recipient[0];
  if (!recipientRow) {
    return { ok: false as const, message: t("email.errors.recipientNotFound") };
  }
  if (recipientRow.id === actor.userId) {
    return { ok: false as const, message: t("email.errors.selfMessage") };
  }

  const messageId = await insertPlatformMessage({
    senderUserId: actor.userId,
    recipientUserId: recipientRow.id,
    subject,
    body,
  });

  const ctx = requestContextFromHeaders(await headers());
  await recordAuditEvent({
    action: "message.sent",
    actorUserId: actor.userId,
    targetType: "user",
    targetId: recipientRow.id,
    metadata: { messageId, channel: "platform" },
    ...ctx,
  });

  return {
    ok: true as const,
    message: t("email.success.delivered"),
    messageId,
  };
}

export async function markMessageRead(actorId: string, messageId: string) {
  await db
    .update(academyMessages)
    .set({ readAt: sql`coalesce(${academyMessages.readAt}, now())` })
    .where(and(eq(academyMessages.id, messageId), eq(academyMessages.recipientUserId, actorId)));
}

export async function toggleMessageStarred(actorId: string, messageId: string) {
  await db
    .update(academyMessages)
    .set({
      starredByRecipient: sql`not ${academyMessages.starredByRecipient}`,
    })
    .where(and(eq(academyMessages.id, messageId), eq(academyMessages.recipientUserId, actorId)));
}

export async function toggleMessageImportant(actorId: string, messageId: string) {
  await db
    .update(academyMessages)
    .set({
      importantByRecipient: sql`not ${academyMessages.importantByRecipient}`,
    })
    .where(and(eq(academyMessages.id, messageId), eq(academyMessages.recipientUserId, actorId)));
}

export async function trashMessage(actorId: string, messageId: string) {
  const rows = await db
    .select({
      senderUserId: academyMessages.senderUserId,
      recipientUserId: academyMessages.recipientUserId,
    })
    .from(academyMessages)
    .where(eq(academyMessages.id, messageId))
    .limit(1);
  const row = rows[0];
  if (!row) return;

  if (row.recipientUserId === actorId) {
    await db
      .update(academyMessages)
      .set({ recipientTrashedAt: new Date() })
      .where(eq(academyMessages.id, messageId));
  }
  if (row.senderUserId === actorId) {
    await db
      .update(academyMessages)
      .set({ senderTrashedAt: new Date() })
      .where(eq(academyMessages.id, messageId));
  }
}

export async function countUnreadInbox(actorId: string) {
  await connection();
  const rows = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(academyMessages)
    .where(
      and(
        eq(academyMessages.recipientUserId, actorId),
        isNull(academyMessages.readAt),
        isNull(academyMessages.recipientTrashedAt),
      ),
    );
  return Number(rows[0]?.value ?? 0);
}

export type InboxNotificationItem = {
  id: string;
  subject: string;
  excerpt: string;
  fromName: string;
  createdAt: string;
  unread: boolean;
};

/** Recent inbox rows for the topbar notifications menu. */
export async function listInboxNotificationFeed(userId: string, limit = 10): Promise<InboxNotificationItem[]> {
  await connection();
  const sender = alias(users, "inbox_sender");

  const rows = await db
    .select({
      id: academyMessages.id,
      subject: academyMessages.subject,
      body: academyMessages.body,
      createdAt: academyMessages.createdAt,
      readAt: academyMessages.readAt,
      fromName: sender.name,
    })
    .from(academyMessages)
    .innerJoin(sender, eq(academyMessages.senderUserId, sender.id))
    .where(
      and(eq(academyMessages.recipientUserId, userId), isNull(academyMessages.recipientTrashedAt)),
    )
    .orderBy(desc(academyMessages.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    subject: row.subject,
    excerpt: row.body.slice(0, 120),
    fromName: row.fromName,
    createdAt: row.createdAt.toISOString(),
    unread: !row.readAt,
  }));
}