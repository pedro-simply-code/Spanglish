import { firstIssueCode, profileUpdateSchema } from "@/lib/profile-schema";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { apiError, json, readJson, requireApiActor } from "@/server/api/http";
import { getUserProfile, updateUserProfile } from "@/server/auth/user-repository";

/** GET /api/v1/me — the signed-in account and its profile. */
export async function GET() {
  const guard = await requireApiActor({ allowIncompleteProfile: true });
  if (guard.response) return guard.response;

  const profile = await getUserProfile(guard.actor.userId);
  if (!profile) return apiError(404, "NOT_FOUND", "Account not found.");

  return json({
    user: {
      ...profile,
      activeRole: guard.actor.activeRole,
      profileComplete: guard.actor.profileComplete,
    },
  });
}

/** PATCH /api/v1/me — edit name, language, time zone, learning goal. */
export async function PATCH(request: Request) {
  const guard = await requireApiActor();
  if (guard.response) return guard.response;

  const parsed = profileUpdateSchema.safeParse(await readJson(request));
  if (!parsed.success) {
    const code = firstIssueCode(parsed.error);
    return apiError(400, code, code);
  }

  const profile = await updateUserProfile(guard.actor.userId, parsed.data);
  if (!profile) return apiError(500, "SAVE_FAILED", "Could not save.");

  await recordAuditEvent({
    ...requestContextFromHeaders(request.headers),
    action: "profile.updated",
    actorUserId: guard.actor.userId,
    metadata: { fields: Object.keys(parsed.data), via: "api" },
  });

  return json({ user: profile });
}
