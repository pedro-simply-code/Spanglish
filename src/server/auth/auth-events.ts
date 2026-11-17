import { isAPIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { normalizeEmail } from "@/lib/auth-validation";
import {
  hasSignedInFromDevice,
  recordAuditEvent,
  requestContextFromHeaders,
  type AuditEventInput,
} from "@/server/audit/audit-log";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { sendSecurityNotice, type SecurityNoticeType } from "@/server/email/send-verification";
import { toEmailLocale, type EmailLocale } from "@/server/email/templates";

/*
 * Audit events and security emails fired from Better Auth hooks. Everything
 * here runs after the response (`after`) and swallows its own errors, so a
 * slow mail server or a failed insert never breaks signing in.
 */

/** Minimal view of a Better Auth endpoint context used by these helpers. */
export type AuthHookContext = {
  path?: string;
  body?: unknown;
  headers?: Headers;
  request?: Request;
  context?: {
    returned?: unknown;
    session?: { user: { id: string; email: string; twoFactorEnabled?: boolean | null } } | null;
    newSession?: { user: { id: string; email: string } } | null;
  };
};

export function hookHeaders(ctx: AuthHookContext | null | undefined) {
  return ctx?.request?.headers ?? ctx?.headers ?? null;
}

function runLater(task: () => Promise<unknown>) {
  try {
    after(async () => {
      try {
        await task();
      } catch (error) {
        console.error("[auth-events]", error);
      }
    });
  } catch {
    // Outside a request (scripts): run now, best effort.
    void task().catch((error) => console.error("[auth-events]", error));
  }
}

export function audit(ctx: AuthHookContext | null | undefined, event: AuditEventInput) {
  const context = requestContextFromHeaders(hookHeaders(ctx));
  runLater(() => recordAuditEvent({ ...context, ...event }));
}

/** Locale for an email: the user's profile, else the visitor's cookie/browser. */
export async function resolveEmailLocale(
  email: string,
  headers: Headers | null,
): Promise<EmailLocale> {
  const [row] = await db
    .select({ locale: users.locale })
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);
  if (row?.locale) return toEmailLocale(row.locale);

  const cookieLocale = headers
    ?.get("cookie")
    ?.match(/(?:^|;\s*)NEXT_LOCALE=(en|es)/)?.[1];
  if (cookieLocale) return toEmailLocale(cookieLocale);

  const accept = headers?.get("accept-language")?.toLowerCase() ?? "";
  return accept.startsWith("es") ? "es" : "en";
}

/** Sends a security notice to the user (skipped for bounced addresses). */
export function notifyUser(
  userId: string,
  type: SecurityNoticeType,
  details?: string[],
) {
  runLater(async () => {
    const [user] = await db
      .select({ email: users.email, locale: users.locale, bounced: users.emailBouncedAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user || user.bounced) return;
    await sendSecurityNotice({
      to: user.email,
      type,
      locale: toEmailLocale(user.locale),
      details,
    });
  });
}

export function notifyEmail(email: string, type: SecurityNoticeType, headers: Headers | null) {
  runLater(async () => {
    const locale = await resolveEmailLocale(email, headers);
    await sendSecurityNotice({ to: email, type, locale });
  });
}

function signInMethod(path: string | undefined) {
  if (!path) return "unknown";
  if (path === "/sign-in/email" || path.startsWith("/two-factor/")) return "password";
  if (path === "/sign-in/email-otp") return "email-code";
  if (path === "/email-otp/verify-email") return "email-verification";
  if (path.startsWith("/callback/") || path === "/sign-in/social") return "google";
  return path;
}

/**
 * A session was created. Records the sign-in and emails the user when the
 * device is new. Session rotations (e.g. turning on 2FA while signed in) are
 * not sign-ins and are skipped.
 */
export function onSessionCreated(
  session: { userId: string; userAgent?: string | null; ipAddress?: string | null },
  ctx: AuthHookContext | null,
) {
  if (ctx?.context?.session) return;

  const method = signInMethod(ctx?.path);
  const userAgent = session.userAgent ?? null;

  runLater(async () => {
    const device = userAgent
      ? await hasSignedInFromDevice(session.userId, userAgent)
      : { hasPreviousSignIns: true, knownDevice: true };

    await recordAuditEvent({
      action: "auth.sign_in",
      actorUserId: session.userId,
      ipAddress: session.ipAddress ?? null,
      userAgent,
      metadata: { method },
    });

    if (device.hasPreviousSignIns && !device.knownDevice) {
      const [user] = await db
        .select({ email: users.email, locale: users.locale, bounced: users.emailBouncedAt })
        .from(users)
        .where(eq(users.id, session.userId))
        .limit(1);
      if (!user || user.bounced) return;
      await sendSecurityNotice({
        to: user.email,
        type: "new-sign-in",
        locale: toEmailLocale(user.locale),
        details: [
          `${userAgent ?? "Unknown device"}`,
          session.ipAddress ? `IP: ${session.ipAddress}` : "",
          new Date().toUTCString(),
        ].filter(Boolean),
      });
    }
  });
}

export function onUserCreated(user: { id: string }, ctx: AuthHookContext | null) {
  audit(ctx, {
    action: "auth.sign_up",
    actorUserId: user.id,
    metadata: { method: signInMethod(ctx?.path) },
  });
}

/** Records outcomes of auth endpoints that are not session creations. */
export function afterAuthEndpoint(ctx: AuthHookContext) {
  const path = ctx.path ?? "";
  const returned = ctx.context?.returned;
  const failed = isAPIError(returned);
  const body = (ctx.body ?? {}) as { email?: unknown };
  const email = typeof body.email === "string" ? normalizeEmail(body.email) : undefined;
  const sessionUser = ctx.context?.session?.user;

  switch (path) {
    case "/sign-in/email":
    case "/sign-in/email-otp":
      if (failed) {
        audit(ctx, {
          action: "auth.sign_in_failed",
          severity: "warning",
          metadata: { method: signInMethod(path), email },
        });
      }
      return;
    case "/email-otp/verify-email":
      if (!failed) audit(ctx, { action: "auth.email_verified", metadata: { email } });
      return;
    case "/change-password":
      if (!failed && sessionUser) {
        audit(ctx, { action: "auth.password_changed", actorUserId: sessionUser.id });
        notifyUser(sessionUser.id, "password-changed");
      }
      return;
    case "/email-otp/reset-password":
      if (!failed && email) {
        runLater(async () => {
          const [user] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email))
            .limit(1);
          if (!user) return;
          await recordAuditEvent({
            ...requestContextFromHeaders(hookHeaders(ctx)),
            action: "auth.password_reset",
            actorUserId: user.id,
            severity: "warning",
          });
          notifyUser(user.id, "password-reset");
        });
      }
      return;
    case "/two-factor/verify-totp":
      // Verifying while signed in with 2FA still off = turning it on.
      if (!failed && sessionUser && !sessionUser.twoFactorEnabled) {
        audit(ctx, { action: "auth.two_factor_enabled", actorUserId: sessionUser.id });
        notifyUser(sessionUser.id, "two-factor-enabled");
      }
      return;
    case "/two-factor/disable":
      if (!failed && sessionUser) {
        audit(ctx, {
          action: "auth.two_factor_disabled",
          actorUserId: sessionUser.id,
          severity: "warning",
        });
        notifyUser(sessionUser.id, "two-factor-disabled");
      }
      return;
    case "/two-factor/generate-backup-codes":
      if (!failed && sessionUser) {
        audit(ctx, {
          action: "auth.two_factor_backup_codes_regenerated",
          actorUserId: sessionUser.id,
        });
      }
      return;
    case "/revoke-session":
    case "/revoke-sessions":
    case "/revoke-other-sessions":
      if (!failed && sessionUser) {
        audit(ctx, {
          action: "auth.sessions_revoked",
          actorUserId: sessionUser.id,
          metadata: { scope: path.slice(1) },
        });
      }
      return;
    case "/sign-out":
      if (!failed && sessionUser) {
        audit(ctx, { action: "auth.sign_out", actorUserId: sessionUser.id });
      }
      return;
    default:
      return;
  }
}
