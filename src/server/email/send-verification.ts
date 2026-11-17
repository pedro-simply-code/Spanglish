import { sql } from "drizzle-orm";
import { env } from "@/env";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { sendTransactionalEmail } from "@/server/email/send-transactional";
import {
  renderAuthCodeEmail,
  renderSecurityNotice,
  type AuthCodeEmailType,
  type EmailLocale,
  type SecurityNoticeType,
} from "@/server/email/templates";
import { insertPlatformMessage } from "@/server/messages/mailbox";
import { getAcademySystemSenderUserId } from "@/server/messages/system-sender";

export type { AuthCodeEmailType, SecurityNoticeType } from "@/server/email/templates";

/**
 * Login verification codes (sign-in, verify email, reset password) → external SMTP/Postmark only.
 * When delivery is not configured on a local dev server, the code is printed in the server
 * terminal (never returned to the browser).
 */
export async function sendAuthCodeEmail(input: {
  to: string;
  code: string;
  type: AuthCodeEmailType;
  locale: EmailLocale;
}) {
  const email = renderAuthCodeEmail({
    locale: input.locale,
    type: input.type,
    code: input.code,
    minutes: env.EMAIL_CODE_TTL_MINUTES,
  });

  const result = await sendTransactionalEmail({ to: input.to, ...email });
  if (result.delivered) return;

  if (env.NODE_ENV === "development") {
    console.info(
      `[auth] Email not delivered (${result.devMessage}). ${input.type} code for ${input.to}: ${input.code}`,
    );
    return;
  }

  console.error(`[auth] ${input.type} email to ${input.to} not delivered: ${result.devMessage}`);
}

/** Security notices → Spanglish inbox (not external mail). Login OTP stays external. */
export async function sendSecurityNotice(input: {
  to: string;
  type: SecurityNoticeType;
  locale: EmailLocale;
  details?: string[];
}) {
  const normalized = input.to.trim().toLowerCase();
  const row = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  const recipient = row[0];
  if (!recipient) {
    if (env.NODE_ENV === "development") {
      console.info(`[auth] ${input.type} platform notice skipped — no user for ${input.to}`);
    }
    return;
  }

  const senderUserId = await getAcademySystemSenderUserId();
  if (!senderUserId) {
    console.error("[auth] no admin user to send security platform notices");
    return;
  }

  const email = renderSecurityNotice(input);
  const body = `${email.text}\n\nOpen Spanglish → Email in the app.`;

  await insertPlatformMessage({
    senderUserId,
    recipientUserId: recipient.id,
    subject: email.subject,
    body,
  });

  if (env.NODE_ENV === "development") {
    console.info(`[auth] ${input.type} platform notice for ${input.to}`);
  }
}
