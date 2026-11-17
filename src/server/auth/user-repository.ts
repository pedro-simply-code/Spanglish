import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { normalizeEmail } from "@/lib/auth-validation";
import { normalizeRoles, type RoleCode } from "@/lib/auth-roles";
import type { ProfileUpdateInput } from "@/lib/profile-schema";
import { db } from "@/server/db";
import {
  accounts,
  users,
  type LearningLanguage,
  type LearningLevel,
  type ProfileLocale,
  type UserRow,
} from "@/server/db/schema";

/**
 * App-side reads and writes of user rows. Sign-up, sign-in, passwords,
 * sessions and 2FA go through Better Auth (src/server/auth/auth.ts); this
 * module only covers what Better Auth does not own: roles and the profile.
 */

/** Version of the terms of service and privacy policy users accept. */
export const CURRENT_TERMS_VERSION = "2026-11";

export async function findUserByEmail(email: string) {
  const rows = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizeEmail(email)))
    .limit(1);

  return rows[0] ?? null;
}

export async function findUserById(id: string) {
  const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return rows[0] ?? null;
}

/** True when the user can sign in with a password (has a credential account). */
export async function userHasPassword(userId: string) {
  const rows = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
    .limit(1);

  return rows.length > 0;
}

export type ProfileInput = {
  name: string;
  locale: ProfileLocale;
  timezone: string;
  learningLanguage: LearningLanguage;
  level: LearningLevel;
  goal: string;
  acceptTerms: boolean;
};

/** Profile fields the app shows and edits (Settings, /api/v1/me). */
export type UserProfile = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  roles: RoleCode[];
  locale: ProfileLocale;
  timezone: string | null;
  learningLanguage: LearningLanguage | null;
  level: LearningLevel | null;
  goal: string | null;
  twoFactorEnabled: boolean;
  profileCompletedAt: string | null;
};

export function toUserProfile(row: UserRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image ?? null,
    roles: normalizeRoles(row.roles ?? []),
    locale: row.locale === "es" ? "es" : "en",
    timezone: row.timezone ?? null,
    learningLanguage: row.learningLanguage ?? null,
    level: row.level ?? null,
    goal: row.goal ?? null,
    twoFactorEnabled: Boolean(row.twoFactorEnabled),
    profileCompletedAt: row.profileCompletedAt?.toISOString() ?? null,
  };
}

export async function getUserProfile(userId: string) {
  const row = await findUserById(userId);
  return row ? toUserProfile(row) : null;
}

/** Saves edits to an already completed profile (validated input). */
export async function updateUserProfile(userId: string, input: ProfileUpdateInput) {
  const [row] = await db
    .update(users)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.locale !== undefined ? { locale: input.locale } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.learningLanguage !== undefined
        ? { learningLanguage: input.learningLanguage }
        : {}),
      ...(input.level !== undefined ? { level: input.level } : {}),
      ...(input.goal !== undefined ? { goal: input.goal || null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return row ? toUserProfile(row) : null;
}

export function isProfileComplete(user: Pick<UserRow, "profileCompletedAt">) {
  return Boolean(user.profileCompletedAt);
}

/** Saves the onboarding answers and marks the profile complete. */
export async function completeUserProfile(userId: string, input: ProfileInput) {
  const now = new Date();
  const [row] = await db
    .update(users)
    .set({
      name: input.name.trim(),
      locale: input.locale,
      timezone: input.timezone,
      learningLanguage: input.learningLanguage,
      level: input.level,
      goal: input.goal.trim() || null,
      termsAcceptedAt: now,
      termsVersion: CURRENT_TERMS_VERSION,
      profileCompletedAt: now,
      updatedAt: now,
    })
    .where(eq(users.id, userId))
    .returning();

  return row ?? null;
}

/**
 * Creates or refreshes a pre-verified account with a password, for the demo
 * seed. Real sign-ups go through Better Auth.
 */
export async function upsertSeedUser(input: {
  email: string;
  name: string;
  password: string;
  roles: RoleCode[];
  timezone: string;
  locale?: ProfileLocale;
  learningLanguage?: LearningLanguage;
  level?: LearningLevel;
  goal?: string | null;
}) {
  const email = normalizeEmail(input.email);
  const now = new Date();
  const passwordHash = await hashPassword(input.password);
  const profile = {
    name: input.name,
    emailVerified: true,
    roles: normalizeRoles(input.roles),
    locale: input.locale ?? "en",
    timezone: input.timezone,
    learningLanguage: input.learningLanguage ?? "spanish",
    level: input.level ?? "intermediate",
    goal: input.goal ?? null,
    termsAcceptedAt: now,
    termsVersion: CURRENT_TERMS_VERSION,
    profileCompletedAt: now,
    updatedAt: now,
  };

  const existing = await findUserByEmail(email);
  const [user] = existing
    ? await db.update(users).set(profile).where(eq(users.id, existing.id)).returning()
    : await db
        .insert(users)
        .values({ id: randomUUID(), email, createdAt: now, ...profile })
        .returning();

  if (!user) return null;

  const [credential] = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential")))
    .limit(1);

  if (credential) {
    await db
      .update(accounts)
      .set({ password: passwordHash, updatedAt: now })
      .where(eq(accounts.id, credential.id));
  } else {
    await db.insert(accounts).values({
      id: randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  }

  return user;
}
