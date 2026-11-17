import { env } from "@/env";

export type EmailProvider = "gmail_smtp" | "postmark";

export function getEmailProvider(): EmailProvider {
  return env.EMAIL_PROVIDER;
}

export function isEmailDeliveryConfigured() {
  if (!env.EMAIL_FROM) {
    return false;
  }

  if (env.EMAIL_PROVIDER === "gmail_smtp") {
    return Boolean(env.SMTP_USER && env.SMTP_PASS);
  }

  if (env.EMAIL_PROVIDER === "postmark") {
    return Boolean(env.POSTMARK_SERVER_TOKEN);
  }

  return false;
}

export function emailProviderSetupHint() {
  if (env.EMAIL_PROVIDER === "gmail_smtp") {
    return "Add EMAIL_FROM, SMTP_USER, and SMTP_PASS (Gmail app password).";
  }
  return "Add EMAIL_FROM and POSTMARK_SERVER_TOKEN.";
}