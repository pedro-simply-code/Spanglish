import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { bearer, captcha, emailOTP, twoFactor } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { after } from "next/server";
import { env } from "@/env";
import { normalizeEmail } from "@/lib/auth-validation";
import {
  authRateLimitRules,
  checkRateLimits,
  rateLimitMessage,
  type RateLimitRule,
} from "@/server/auth/rate-limit";
import { db } from "@/server/db";
import * as schema from "@/server/db/schema";
import {
  afterAuthEndpoint,
  audit,
  hookHeaders,
  notifyEmail,
  onSessionCreated,
  onUserCreated,
  resolveEmailLocale,
  type AuthHookContext,
} from "@/server/auth/auth-events";
import { sendAuthCodeEmail } from "@/server/email/send-verification";
import { syncOwnerRoles } from "@/server/auth/owner";
import { captchaEnabled, googleSignInEnabled } from "@/server/auth/platform-flags";

export { captchaEnabled, googleSignInEnabled } from "@/server/auth/platform-flags";

const developmentSecret =
  "spanglish-better-auth-development-secret-do-not-use-in-production";

function getBetterAuthSecret() {
  if (env.BETTER_AUTH_SECRET) return env.BETTER_AUTH_SECRET;
  if (env.NODE_ENV === "production") {
    throw new Error("BETTER_AUTH_SECRET must be set (32+ characters) in production.");
  }
  return developmentSecret;
}

/** Web client first (OAuth redirects); the Android client for native ID tokens. */
const googleClientIds = [env.GOOGLE_CLIENT_ID, env.GOOGLE_ANDROID_CLIENT_ID].filter(
  (value): value is string => Boolean(value),
);

/**
 * Turning off 2FA or creating new backup codes needs the password. Accounts
 * without a password do it through a Server Action that first checks an
 * authenticator code (see features/auth/actions.ts), so direct HTTP calls
 * without a password are refused.
 */
const passwordOrCodeRequired = new Set([
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
]);

/** Endpoints a session that still owes its 2FA code may call. */
const allowedWhileTwoFactorPending = new Set([
  "/get-session",
  "/sign-out",
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
]);

/** Per-email limits on top of Better Auth's per-IP `rateLimit`. */
const perEmailLimits: Record<string, { kind: string; rule: RateLimitRule }> = {
  "/sign-in/email": { kind: "sign-in", rule: authRateLimitRules.signInPerEmail },
  "/sign-up/email": { kind: "sign-up", rule: authRateLimitRules.signUpPerEmail },
  "/email-otp/send-verification-otp": {
    kind: "code-request",
    rule: authRateLimitRules.codeRequestPerEmail,
  },
  "/email-otp/request-password-reset": {
    kind: "code-request",
    rule: authRateLimitRules.codeRequestPerEmail,
  },
  "/forget-password/email-otp": {
    kind: "code-request",
    rule: authRateLimitRules.codeRequestPerEmail,
  },
  "/sign-in/email-otp": { kind: "code-verify", rule: authRateLimitRules.codeVerifyPerEmail },
  "/email-otp/verify-email": {
    kind: "code-verify",
    rule: authRateLimitRules.codeVerifyPerEmail,
  },
  "/email-otp/check-verification-otp": {
    kind: "code-verify",
    rule: authRateLimitRules.codeVerifyPerEmail,
  },
  "/email-otp/reset-password": {
    kind: "code-verify",
    rule: authRateLimitRules.codeVerifyPerEmail,
  },
};

/**
 * Better Auth's two-factor plugin only challenges email + password sign-ins.
 * Email-code and Google sign-ins of an account with 2FA start in a "pending"
 * session that must verify the authenticator code before reaching anything.
 */
function sessionStartsPending(path: string | undefined, twoFactorEnabled: boolean) {
  if (!twoFactorEnabled) return false;
  if (!path) return true;
  // Password sign-in only creates a session once 2FA passed (or on a trusted
  // device); the /two-factor/* endpoints create it after a valid code.
  return !(path === "/sign-in/email" || path.startsWith("/two-factor/"));
}

export const auth = betterAuth({
  appName: "Spanglish Academy",
  baseURL: env.NEXT_PUBLIC_APP_URL,
  secret: getBetterAuthSecret(),
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
      twoFactor: schema.twoFactors,
      rateLimit: schema.rateLimits,
    },
  }),
  advanced: {
    cookiePrefix: "spanglish",
    useSecureCookies: env.NODE_ENV === "production",
  },
  user: {
    additionalFields: {
      roles: {
        type: "string[]",
        required: false,
        defaultValue: ["student"],
        input: false,
      },
      locale: { type: "string", required: false, defaultValue: "en", input: false },
      timezone: { type: "string", required: false, input: false },
      learningLanguage: { type: "string", required: false, input: false },
      level: { type: "string", required: false, input: false },
      goal: { type: "string", required: false, input: false },
      termsAcceptedAt: { type: "date", required: false, input: false },
      termsVersion: { type: "string", required: false, input: false },
      profileCompletedAt: { type: "date", required: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    additionalFields: {
      twoFactorPending: {
        type: "boolean",
        required: false,
        defaultValue: false,
        input: false,
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true,
      // Google only returns verified addresses, so it may join an existing
      // account with the same email.
      trustedProviders: ["google"],
    },
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    minPasswordLength: 8,
    // bcrypt-era limit kept for compatibility with the old forms.
    maxPasswordLength: 72,
    autoSignIn: false,
    revokeSessionsOnPasswordReset: true,
    async onExistingUserSignUp({ user }, request) {
      notifyEmail(user.email, "existing-account", request?.headers ?? null);
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: googleSignInEnabled
    ? {
        google: {
          clientId: googleClientIds,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},
  rateLimit: {
    enabled: true,
    storage: "database",
    window: 60,
    max: 100,
    customRules: {
      "/sign-in/email": { window: 15 * 60, max: 20 },
      "/sign-up/email": { window: 60 * 60, max: 5 },
      "/sign-in/email-otp": { window: 15 * 60, max: 30 },
      "/email-otp/send-verification-otp": { window: 60 * 60, max: 10 },
      "/email-otp/request-password-reset": { window: 60 * 60, max: 10 },
      "/forget-password/email-otp": { window: 60 * 60, max: 10 },
      "/two-factor/verify-totp": { window: 15 * 60, max: 20 },
      "/two-factor/verify-backup-code": { window: 15 * 60, max: 10 },
    },
  },
  databaseHooks: {
    user: {
      create: {
        after: async (user, ctx) => onUserCreated(user, ctx as AuthHookContext | null),
      },
    },
    session: {
      create: {
        after: async (session, ctx) =>
          onSessionCreated(session, ctx as AuthHookContext | null),
        before: async (session, ctx) => {
          const [user] = await db
            .select({
              id: schema.users.id,
              email: schema.users.email,
              emailVerified: schema.users.emailVerified,
              roles: schema.users.roles,
              twoFactorEnabled: schema.users.twoFactorEnabled,
            })
            .from(schema.users)
            .where(eq(schema.users.id, session.userId))
            .limit(1);

          // New sign-ins only (not session refreshes): apply ADMIN_EMAIL.
          if (user && !ctx?.context?.session) {
            await syncOwnerRoles(user, {
              ipAddress: session.ipAddress,
              userAgent: session.userAgent,
            });
          }

          return {
            data: {
              ...session,
              twoFactorPending: sessionStartsPending(
                ctx?.path,
                Boolean(user?.twoFactorEnabled),
              ),
            },
          };
        },
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      const limit = perEmailLimits[ctx.path];
      const rawEmail = (ctx.body as { email?: unknown } | undefined)?.email;
      if (limit && typeof rawEmail === "string" && rawEmail.trim()) {
        const email = normalizeEmail(rawEmail);
        const result = await checkRateLimits([
          { key: `${limit.kind}:email:${email}`, rule: limit.rule },
        ]);
        if (!result.allowed) {
          audit(ctx as AuthHookContext, {
            action: "auth.rate_limited",
            severity: "warning",
            metadata: { path: ctx.path, email },
          });
          throw new APIError("TOO_MANY_REQUESTS", {
            message: rateLimitMessage(result.retryAfterSeconds),
            code: "RATE_LIMITED",
          });
        }
      }

      if (passwordOrCodeRequired.has(ctx.path) && ctx.request) {
        const password = (ctx.body as { password?: unknown } | undefined)?.password;
        if (typeof password !== "string" || !password) {
          throw new APIError("FORBIDDEN", {
            message: "Confirm with your authenticator code in Settings → Security.",
            code: "TWO_FACTOR_CODE_REQUIRED",
          });
        }
      }

      if (!allowedWhileTwoFactorPending.has(ctx.path)) {
        const current = await getSessionFromCtx(ctx).catch(() => null);
        const pending = (current?.session as { twoFactorPending?: boolean } | undefined)
          ?.twoFactorPending;
        if (pending) {
          throw new APIError("FORBIDDEN", {
            message: "Enter your authenticator code to finish signing in.",
            code: "TWO_FACTOR_PENDING",
          });
        }
      }
    }),
    after: createAuthMiddleware(async (ctx) => {
      afterAuthEndpoint(ctx as unknown as AuthHookContext);
    }),
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: env.EMAIL_CODE_TTL_MINUTES * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      // Email + code also creates the account when the email is new.
      disableSignUp: false,
      overrideDefaultEmailVerification: true,
      async sendVerificationOTP({ email, otp, type }, ctx) {
        const headers = hookHeaders(ctx as AuthHookContext | undefined);
        // Not awaited inside the request so response time does not reveal
        // whether an email was sent; `after` keeps it alive on serverless.
        after(async () => {
          const locale = await resolveEmailLocale(email, headers);
          await sendAuthCodeEmail({ to: email, code: otp, type, locale });
        });
      },
    }),
    twoFactor({
      issuer: "Spanglish Academy",
      // Accounts without a password (Google or email code) can use 2FA too.
      allowPasswordless: true,
    }),
    // The Android app sends the session token as `Authorization: Bearer`.
    bearer(),
    ...(captchaEnabled
      ? [
          captcha({
            provider: "cloudflare-turnstile",
            secretKey: env.TURNSTILE_SECRET_KEY!,
            endpoints: [
              "/sign-up/email",
              "/email-otp/send-verification-otp",
              "/email-otp/request-password-reset",
              "/forget-password/email-otp",
            ],
          }),
        ]
      : []),
    // Must stay last: lets Server Actions set auth cookies.
    nextCookies(),
  ],
});

export type Auth = typeof auth;
