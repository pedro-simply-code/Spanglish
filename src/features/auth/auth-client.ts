import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Browser client for the Better Auth endpoints under /api/auth. The Android
 * app will use the same endpoints through its own client.
 */
export const authClient = createAuthClient({
  plugins: [
    emailOTPClient(),
    // Password sign-ins of accounts with 2FA continue on /two-factor.
    twoFactorClient({ twoFactorPage: "/two-factor" }),
  ],
});

/** Readable message from a Better Auth client error. */
export function authErrorMessage(
  error: { message?: string; code?: string; status?: number } | null | undefined,
  fallback = "Something went wrong. Try again.",
) {
  if (!error) return fallback;
  if (error.status === 429 && !error.message) {
    return "Too many attempts. Try again in a few minutes.";
  }
  return error.message || fallback;
}
