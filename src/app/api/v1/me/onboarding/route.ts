import { firstIssueCode, onboardingSchema } from "@/lib/profile-schema";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { apiError, json, readJson, requireApiActor } from "@/server/api/http";
import { completeUserProfile, toUserProfile } from "@/server/auth/user-repository";

/** POST /api/v1/me/onboarding — first-login profile (terms required). */
export async function POST(request: Request) {
  const guard = await requireApiActor({ allowIncompleteProfile: true });
  if (guard.response) return guard.response;

  const parsed = onboardingSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    const code = firstIssueCode(parsed.error);
    return apiError(400, code, code);
  }

  const row = await completeUserProfile(guard.actor.userId, parsed.data);
  if (!row) return apiError(500, "SAVE_FAILED", "Could not save.");

  await recordAuditEvent({
    ...requestContextFromHeaders(request.headers),
    action: "profile.completed",
    actorUserId: guard.actor.userId,
    metadata: { via: "api" },
  });

  return json({ user: toUserProfile(row) });
}
