import {
  emailProviderSetupHint,
  getEmailProvider,
  isEmailDeliveryConfigured,
} from "@/server/email/config";
import { sendViaGmailSmtp } from "@/server/email/providers/gmail-smtp";
import { sendViaPostmark } from "@/server/email/providers/postmark";

export type TransactionalEmailResult =
  | { delivered: true; devMessage: null }
  | { delivered: false; devMessage: string };

/** External SMTP/Postmark — login verification codes only (see send-verification.ts). */
export async function sendTransactionalEmail(input: {
  to: string;
  subject: string;
  text: string;
  /** Shown in dev/offline responses when delivery fails or is not configured. */
  fallbackHint?: string;
}): Promise<TransactionalEmailResult> {
  if (!isEmailDeliveryConfigured()) {
    return {
      delivered: false,
      devMessage:
        input.fallbackHint ??
        `Email not configured. ${emailProviderSetupHint()}`,
    };
  }

  const provider = getEmailProvider();
  const result =
    provider === "postmark"
      ? await sendViaPostmark(input)
      : await sendViaGmailSmtp(input);

  if (result.ok) {
    return { delivered: true, devMessage: null };
  }

  return {
    delivered: false,
    devMessage: `Could not send email (${result.error}).${input.fallbackHint ? ` ${input.fallbackHint}` : ""}`,
  };
}