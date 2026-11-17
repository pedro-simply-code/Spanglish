"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { getActiveDashboard, hasRole } from "@/features/auth/roles";
import type { RoleCode } from "@/features/auth/roles";
import type { AuthActionResult } from "@/features/auth/types";
import { getCodeError, getPasswordError } from "@/lib/auth-validation";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { auth } from "@/server/auth/auth";
import { notifyUser } from "@/server/auth/auth-events";
import { checkRateLimits, rateLimitMessage } from "@/server/auth/rate-limit";
import {
  clearSession,
  getActorAllowIncompleteProfile,
  getAuthState,
  getCurrentSessionId,
  getDashboardPath,
  getPostSignInPath,
  getSession,
  setActiveRole,
} from "@/server/auth/session";
import {
  completeUserProfile,
  updateUserProfile,
  userHasPassword,
} from "@/server/auth/user-repository";
import { setLocaleCookie } from "@/i18n/locale";
import {
  firstIssueCode,
  onboardingSchema,
  profileUpdateSchema,
  type OnboardingInput,
  type ProfileUpdateInput,
} from "@/lib/profile-schema";
import { db } from "@/server/db";
import { sessions } from "@/server/db/schema";

/*
 * Sign-in, sign-up, email codes and password reset run in the browser
 * against Better Auth (`authClient`). The actions here cover what needs the
 * server session: onboarding, the 2FA step for email-code and Google
 * sign-ins, setting a first password, dashboard switching and sign-out.
 */

const TWO_FACTOR_ATTEMPTS = { limit: 5, windowSeconds: 15 * 60 };

async function auditFromRequest(
  event: Omit<Parameters<typeof recordAuditEvent>[0], "ipAddress" | "userAgent">,
) {
  await recordAuditEvent({ ...requestContextFromHeaders(await headers()), ...event });
}

function apiErrorCode(error: unknown, fallback: string) {
  if (isAPIError(error)) {
    const body = error.body as { code?: string } | undefined;
    return body?.code || fallback;
  }
  return fallback;
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (isAPIError(error)) {
    const body = error.body as { message?: string } | undefined;
    return body?.message || error.message || fallback;
  }
  return fallback;
}

export async function signOutAction() {
  await clearSession();
  redirect("/login");
}

export async function switchDashboardAction(role: RoleCode) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (!hasRole(session.roles, role)) {
    redirect(getActiveDashboard(session.roles, session.activeRole).path);
  }

  const path = await setActiveRole(role);

  redirect(
    path ?? getActiveDashboard(session.roles, session.activeRole).path,
  );
}

/** Saves the onboarding answers. Required before using the app. */
export async function completeOnboardingAction(
  input: OnboardingInput,
): Promise<AuthActionResult> {
  const actor = await getActorAllowIncompleteProfile();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    const code = firstIssueCode(parsed.error);
    return { ok: false, code, message: code, field: code.startsWith("NAME") ? "name" : undefined };
  }

  const saved = await completeUserProfile(actor.userId, parsed.data);
  if (!saved) {
    return { ok: false, code: "SAVE_FAILED", message: "SAVE_FAILED" };
  }

  await setLocaleCookie(parsed.data.locale);
  await auditFromRequest({ action: "profile.completed", actorUserId: actor.userId });

  return {
    ok: true,
    message: "PROFILE_SAVED",
    redirectTo: getDashboardPath(actor.roles, actor.activeRole),
  };
}

/** Edits the profile from Settings. */
export async function updateProfileAction(
  input: ProfileUpdateInput,
): Promise<AuthActionResult> {
  const actor = await getSession();
  if (!actor) return { ok: false, code: "SIGNED_OUT", message: "SIGNED_OUT" };

  const parsed = profileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    const code = firstIssueCode(parsed.error);
    return { ok: false, code, message: code };
  }

  const saved = await updateUserProfile(actor.userId, parsed.data);
  if (!saved) return { ok: false, code: "SAVE_FAILED", message: "SAVE_FAILED" };

  if (parsed.data.locale) await setLocaleCookie(parsed.data.locale);
  await auditFromRequest({
    action: "profile.updated",
    actorUserId: actor.userId,
    metadata: { fields: Object.keys(parsed.data) },
  });

  return { ok: true, message: "PROFILE_SAVED" };
}

/** Language switch for visitors and signed-in users (cookie + profile). */
export async function setLocaleAction(locale: "en" | "es") {
  if (locale !== "en" && locale !== "es") return;
  await setLocaleCookie(locale);
  const actor = await getSession();
  if (actor) await updateUserProfile(actor.userId, { locale });
}

/**
 * Finishes an email-code or Google sign-in for an account with 2FA. Better
 * Auth does not limit attempts once a session exists, so this action allows
 * 5 tries per session and then signs that session out.
 */
export async function verifyPendingTwoFactorAction(input: {
  code: string;
  kind: "totp" | "backup";
}): Promise<AuthActionResult> {
  const state = await getAuthState();
  if (state.status === "signed-in") {
    return {
      ok: true,
      message: "You are signed in.",
      redirectTo: getPostSignInPath(state.session),
    };
  }
  if (state.status === "signed-out") {
    return {
      ok: false,
      code: "SESSION_EXPIRED",
      message: "Your sign-in expired. Start again.",
      redirectTo: "/login",
    };
  }

  const sessionId = await getCurrentSessionId();
  if (!sessionId) {
    return {
      ok: false,
      code: "SESSION_EXPIRED",
      message: "Your sign-in expired. Start again.",
      redirectTo: "/login",
    };
  }

  const code = (input.code ?? "").trim();
  if (input.kind === "totp") {
    const codeError = getCodeError(code);
    if (codeError) return { ok: false, code: "CODE_INVALID", message: codeError, field: "code" };
  } else if (code.length < 6 || code.length > 32) {
    return {
      ok: false,
      code: "BACKUP_CODE_REQUIRED",
      message: "Enter one of your backup codes.",
      field: "code",
    };
  }

  const limit = await checkRateLimits([
    { key: `two-factor:session:${sessionId}`, rule: TWO_FACTOR_ATTEMPTS },
  ]);
  if (!limit.allowed) {
    await auditFromRequest({
      action: "auth.two_factor_lockout",
      severity: "critical",
      targetType: "session",
      targetId: sessionId,
      metadata: { email: state.email },
    });
    await clearSession();
    return {
      ok: false,
      code: "RATE_LIMITED",
      message: `${rateLimitMessage(limit.retryAfterSeconds)} Sign in again.`,
      redirectTo: "/login",
    };
  }

  try {
    const requestHeaders = await headers();
    if (input.kind === "totp") {
      await auth.api.verifyTOTP({ body: { code }, headers: requestHeaders });
    } else {
      await auth.api.verifyBackupCode({ body: { code }, headers: requestHeaders });
    }
  } catch (error) {
    return {
      ok: false,
      code: apiErrorCode(error, "INVALID_CODE"),
      message: apiErrorMessage(error, "That code is not valid. Try again."),
      field: "code",
    };
  }

  await db
    .update(sessions)
    .set({ twoFactorPending: false, updatedAt: new Date() })
    .where(eq(sessions.id, sessionId));

  const actor = await getSession();
  return {
    ok: true,
    message: "Signed in.",
    redirectTo: actor ? getPostSignInPath(actor) : "/dashboard",
  };
}

/**
 * Adds a password to an account created with Google or an email code, so it
 * can also sign in with email and password.
 */
export async function setInitialPasswordAction(input: {
  password: string;
}): Promise<AuthActionResult> {
  const actor = await getSession();
  if (!actor) return { ok: false, code: "SIGNED_OUT", message: "Sign in again to continue." };

  const passwordError = getPasswordError(input.password ?? "");
  if (passwordError) {
    return { ok: false, code: "PASSWORD_TOO_SHORT", message: passwordError, field: "password" };
  }

  if (await userHasPassword(actor.userId)) {
    return {
      ok: false,
      code: "PASSWORD_ALREADY_SET",
      message: "Your account already has a password. Use “Change password”.",
    };
  }

  try {
    await auth.api.setPassword({
      body: { newPassword: input.password },
      headers: await headers(),
    });
  } catch (error) {
    return {
      ok: false,
      code: apiErrorCode(error, "SAVE_FAILED"),
      message: apiErrorMessage(error, "Could not set the password. Try again."),
      field: "password",
    };
  }

  await auditFromRequest({ action: "auth.password_created", actorUserId: actor.userId });
  notifyUser(actor.userId, "password-created");

  return { ok: true, message: "Password created. You can now sign in with it." };
}

/**
 * Accounts without a password confirm 2FA changes with a current
 * authenticator code instead (5 tries per 15 minutes).
 */
async function confirmWithAuthenticatorCode(userId: string, code: string) {
  const codeError = getCodeError(code ?? "");
  if (codeError) return { ok: false as const, code: "CODE_INVALID", message: codeError };

  if (await userHasPassword(userId)) {
    return {
      ok: false as const,
      code: "HAS_PASSWORD",
      message: "Your account has a password. Confirm with your password instead.",
    };
  }

  const limit = await checkRateLimits([
    { key: `two-factor-manage:user:${userId}`, rule: TWO_FACTOR_ATTEMPTS },
  ]);
  if (!limit.allowed) {
    return {
      ok: false as const,
      code: "RATE_LIMITED",
      message: rateLimitMessage(limit.retryAfterSeconds),
    };
  }

  try {
    await auth.api.verifyTOTP({ body: { code: code.trim() }, headers: await headers() });
  } catch (error) {
    return {
      ok: false as const,
      code: apiErrorCode(error, "INVALID_CODE"),
      message: apiErrorMessage(error, "That code is not valid. Try again."),
    };
  }
  return { ok: true as const };
}

/** Turns off 2FA for an account without a password (authenticator code). */
export async function disableTwoFactorWithCodeAction(input: {
  code: string;
}): Promise<AuthActionResult> {
  const actor = await getSession();
  if (!actor) return { ok: false, message: "Sign in again to continue." };

  const check = await confirmWithAuthenticatorCode(actor.userId, input.code);
  if (!check.ok) return { ok: false, code: check.code, message: check.message, field: "code" };

  try {
    await auth.api.disableTwoFactor({ body: {}, headers: await headers() });
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "Could not turn off 2FA.") };
  }
  return { ok: true, message: "Two-factor authentication is off." };
}

/** New backup codes for an account without a password (authenticator code). */
export async function regenerateBackupCodesWithCodeAction(input: {
  code: string;
}): Promise<AuthActionResult & { backupCodes?: string[] }> {
  const actor = await getSession();
  if (!actor) return { ok: false, message: "Sign in again to continue." };

  const check = await confirmWithAuthenticatorCode(actor.userId, input.code);
  if (!check.ok) return { ok: false, code: check.code, message: check.message, field: "code" };

  try {
    const result = await auth.api.generateBackupCodes({
      body: {},
      headers: await headers(),
    });
    return { ok: true, message: "New backup codes created.", backupCodes: result.backupCodes };
  } catch (error) {
    return { ok: false, message: apiErrorMessage(error, "Could not create backup codes.") };
  }
}

/** Whether the signed-in account has a password (for the Security tab). */
export async function getPasswordStatusAction() {
  const actor = await getSession();
  if (!actor) return { hasPassword: false };
  return { hasPassword: await userHasPassword(actor.userId) };
}
