import { ServerClient } from "postmark";
import { env } from "@/env";

export async function sendViaPostmark(input: {
  to: string;
  subject: string;
  text: string;
}) {
  if (!env.POSTMARK_SERVER_TOKEN || !env.EMAIL_FROM) {
    return {
      ok: false as const,
      error: "Postmark is not fully configured.",
    };
  }

  const client = new ServerClient(env.POSTMARK_SERVER_TOKEN);

  try {
    await client.sendEmail({
      From: env.EMAIL_FROM,
      To: input.to,
      Subject: input.subject,
      TextBody: input.text,
      MessageStream: env.POSTMARK_MESSAGE_STREAM,
    });
    return { ok: true as const };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Postmark send failed.";
    return { ok: false as const, error: message };
  }
}