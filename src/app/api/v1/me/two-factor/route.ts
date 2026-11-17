import { z } from "zod";
import { verifyPendingTwoFactorAction } from "@/features/auth";
import { apiError, json, readJson } from "@/server/api/http";

const bodySchema = z.object({
  code: z.string().min(1).max(32),
  kind: z.enum(["totp", "backup"]).default("totp"),
});

/**
 * POST /api/v1/me/two-factor — finishes an email-code or Google sign-in of an
 * account with 2FA (the session is pending until a valid code). Same rules as
 * the web: 5 wrong codes sign the pending session out.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) return apiError(400, "INVALID_INPUT", "Send code and kind.");

  const result = await verifyPendingTwoFactorAction(parsed.data);
  if (!result.ok) {
    const code = result.code ?? "INVALID_CODE";
    const status =
      code === "SESSION_EXPIRED" ? 401 : code === "RATE_LIMITED" ? 429 : 400;
    return apiError(status, code, result.message);
  }

  return json({ ok: true });
}
