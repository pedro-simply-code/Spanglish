import { sql } from "drizzle-orm";
import { db } from "@/server/db";
import { authRateLimits } from "@/server/db/schema";

export type RateLimitRule = {
  /** Requests allowed inside one window. */
  limit: number;
  windowSeconds: number;
};

export type RateLimitCheck = {
  key: string;
  rule: RateLimitRule;
};

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Per-email limits for auth actions. Better Auth already limits each IP
 * (see `rateLimit` in auth.ts); these stop one inbox or account from being
 * targeted from many IPs.
 */
export const authRateLimitRules = {
  signInPerEmail: { limit: 5, windowSeconds: 15 * 60 },
  codeRequestPerEmail: { limit: 3, windowSeconds: 60 * 60 },
  codeVerifyPerEmail: { limit: 10, windowSeconds: 15 * 60 },
  signUpPerEmail: { limit: 3, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/** Per-user limits for practice with Luna (each call costs API money). */
export const aiRateLimitRules = {
  messagePerUser: { limit: 20, windowSeconds: 60 },
  startPerUser: { limit: 10, windowSeconds: 60 * 60 },
  translatePerUser: { limit: 30, windowSeconds: 60 * 60 },
} satisfies Record<string, RateLimitRule>;

/**
 * Counts one hit for `key` in a fixed window stored in Postgres and reports
 * whether the caller is still under the limit. A single upsert keeps it atomic
 * across server instances.
 */
async function hit(key: string, rule: RateLimitRule): Promise<RateLimitResult> {
  const windowSeconds = sql`(${rule.windowSeconds})::int * interval '1 second'`;
  const expired = sql`${authRateLimits.windowStart} < now() - ${windowSeconds}`;

  const [row] = await db
    .insert(authRateLimits)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: authRateLimits.key,
      set: {
        count: sql`CASE WHEN ${expired} THEN 1 ELSE ${authRateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${expired} THEN now() ELSE ${authRateLimits.windowStart} END`,
      },
    })
    .returning({
      count: authRateLimits.count,
      windowStart: authRateLimits.windowStart,
    });

  if (!row || row.count <= rule.limit) {
    return { allowed: true };
  }

  const resetAt = row.windowStart.getTime() + rule.windowSeconds * 1000;
  return {
    allowed: false,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)),
  };
}

/** Applies every check; blocked if any of them is over its limit. */
export async function checkRateLimits(
  checks: readonly RateLimitCheck[],
): Promise<RateLimitResult> {
  const results = await Promise.all(
    checks.map((check) => hit(check.key, check.rule)),
  );

  const blocked = results.filter(
    (result): result is Extract<RateLimitResult, { allowed: false }> =>
      !result.allowed,
  );

  if (!blocked.length) {
    return { allowed: true };
  }

  return {
    allowed: false,
    retryAfterSeconds: Math.max(...blocked.map((result) => result.retryAfterSeconds)),
  };
}

export function rateLimitMessage(retryAfterSeconds: number) {
  const minutes = Math.ceil(retryAfterSeconds / 60);
  return minutes <= 1
    ? "Too many attempts. Try again in a minute."
    : `Too many attempts. Try again in ${minutes} minutes.`;
}
