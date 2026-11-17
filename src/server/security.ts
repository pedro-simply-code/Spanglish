import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/env";

const developmentSecret =
  "spanglish-development-signing-secret-do-not-use-in-production";

/**
 * Returns the secret used for session cookies and meeting tokens. Production
 * refuses to start signing with the development fallback.
 */
export function getSigningSecret() {
  if (env.AUTH_SECRET) {
    return env.AUTH_SECRET;
  }

  if (env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET must be set to at least 32 characters in production.",
    );
  }

  return developmentSecret;
}

export function signPayload(payload: string) {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function verifySignature(payload: string, signature: string) {
  const expected = signPayload(payload);
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  );
}
