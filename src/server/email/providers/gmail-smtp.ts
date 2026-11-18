import { getTranslations } from "next-intl/server";
import nodemailer from "nodemailer";
import { env } from "@/env";

export async function sendViaGmailSmtp(input: {
  to: string;
  subject: string;
  text: string;
}) {
  const t = await getTranslations("ops.providers");
  if (!env.SMTP_USER || !env.SMTP_PASS || !env.EMAIL_FROM) {
    return { ok: false as const, error: t("gmailNotConfigured") };
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("gmailSendFailed");
    return { ok: false as const, error: message };
  }
}