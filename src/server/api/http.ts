import type { AuthSession } from "@/lib/auth-types";
import { hasPermission, type Permission } from "@/lib/auth-roles";
import { checkRateLimits } from "@/server/auth/rate-limit";
import { getAuthState } from "@/server/auth/session";

/*
 * Helpers for /api/v1 route handlers (web and the Android app). Auth comes
 * from the session cookie or `Authorization: Bearer <session token>` (Better
 * Auth `bearer` plugin). Errors are JSON with a stable `code` that clients
 * translate.
 */

export type ApiErrorBody = { error: { code: string; message: string } };

export function json<T>(data: T, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { "Cache-Control": "no-store", ...(init?.headers ?? {}) },
  });
}

export function apiError(status: number, code: string, message: string) {
  return json<ApiErrorBody>({ error: { code, message } }, { status });
}

const API_RATE_LIMIT = { limit: 120, windowSeconds: 60 };

type GuardOptions = {
  permission?: Permission;
  /** Allow accounts that have not finished onboarding (e.g. GET /me). */
  allowIncompleteProfile?: boolean;
};

/**
 * Resolves the caller. Returns the actor, or a ready-to-send error response.
 */
export async function requireApiActor(
  options: GuardOptions = {},
): Promise<{ actor: AuthSession; response?: never } | { actor?: never; response: Response }> {
  const state = await getAuthState();
  if (state.status === "signed-out") {
    return { response: apiError(401, "UNAUTHENTICATED", "Sign in to continue.") };
  }
  if (state.status === "two-factor-pending") {
    return {
      response: apiError(403, "TWO_FACTOR_PENDING", "Enter your authenticator code to finish signing in."),
    };
  }

  const actor = state.session;
  if (!options.allowIncompleteProfile && !actor.profileComplete) {
    return {
      response: apiError(403, "PROFILE_INCOMPLETE", "Complete your profile first."),
    };
  }
  if (options.permission && !hasPermission(actor.roles, options.permission)) {
    return { response: apiError(403, "FORBIDDEN", "Your account cannot do this.") };
  }

  const limit = await checkRateLimits([
    { key: `api:user:${actor.userId}`, rule: API_RATE_LIMIT },
  ]);
  if (!limit.allowed) {
    return {
      response: apiError(429, "RATE_LIMITED", "Too many requests. Slow down."),
    };
  }

  return { actor };
}

/** Parses a JSON body; returns null when it is missing or invalid. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** HTTP status for booking and class-change error codes. */
export const bookingErrorStatus: Record<string, number> = {
  TEACHER_NOT_FOUND: 404,
  CLASS_NOT_FOUND: 404,
  REQUEST_NOT_FOUND: 404,
  TOPIC_TOO_SHORT: 400,
  NOT_PAIRED: 409,
  SLOT_UNAVAILABLE: 409,
  SLOT_TAKEN: 409,
  NO_CREDITS: 402,
  CHANGE_NOT_ALLOWED: 409,
  REQUEST_PENDING: 409,
  SAVE_FAILED: 500,
};
