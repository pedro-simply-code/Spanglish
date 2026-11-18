import { env } from "@/env";

/** Google OAuth for web (and related UI) without loading the Better Auth module. */
export const googleSignInEnabled = Boolean(
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET,
);

if (!googleSignInEnabled && (env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_SECRET)) {
  console.warn(
    `[auth] Google sign-in is off: ${env.GOOGLE_CLIENT_ID ? "GOOGLE_CLIENT_SECRET" : "GOOGLE_CLIENT_ID"} is missing in .env.`,
  );
}

export const captchaEnabled = Boolean(env.TURNSTILE_SECRET_KEY);