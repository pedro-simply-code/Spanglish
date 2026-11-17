import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { env } from "@/env";
import {
  getActiveDashboard,
  getPrimaryRole,
  hasPermission,
  hasRole,
  isRoleCode,
  normalizeRoles,
} from "@/lib/auth-roles";
import type { AuthSession } from "@/lib/auth-types";
import type { Permission, RoleCode } from "@/lib/auth-roles";
import { enforceOwnerRoles } from "@/server/auth/owner";
import { auth } from "@/server/auth/auth";

/*
 * Sessions are Better Auth sessions stored in the `sessions` table (web: a
 * cookie; Android later: a Bearer token on the same table). This module maps
 * them to the `AuthSession` shape the rest of the app uses and keeps the
 * "one visible dashboard" preference in its own cookie.
 */

const DASHBOARD_COOKIE_TTL_SECONDS = 60 * 60 * 24 * 365;

type RawSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export type AuthState =
  | { status: "signed-out" }
  | { status: "two-factor-pending"; email: string }
  | { status: "signed-in"; session: AuthSession };

/** Better Auth session for this request (cached per request). */
const getRawSession = cache(async (): Promise<RawSession | null> => {
  // Session validation reads the real clock and cookies, so it runs per
  // request; `connection()` keeps the shell out of the prerendered output.
  await connection();
  return auth.api.getSession({ headers: await headers() });
});

async function getPreferredDashboardRole(roles: readonly RoleCode[]) {
  const cookieStore = await cookies();
  const preferred = cookieStore.get(env.AUTH_DASHBOARD_COOKIE)?.value;

  if (preferred && isRoleCode(preferred) && roles.includes(preferred)) {
    return preferred;
  }

  return getPrimaryRole(roles);
}

async function toAuthSession(raw: RawSession): Promise<AuthSession> {
  const roles = enforceOwnerRoles(raw.user.email, normalizeRoles(raw.user.roles ?? []));
  const activeRole = await getPreferredDashboardRole(roles);

  return {
    userId: raw.user.id,
    name: raw.user.name,
    email: raw.user.email,
    image: raw.user.image ?? null,
    roles,
    activeRole: getActiveDashboard(roles, activeRole).activeRole,
    locale: raw.user.locale === "es" ? "es" : "en",
    profileComplete: Boolean(raw.user.profileCompletedAt),
    twoFactorEnabled: Boolean(raw.user.twoFactorEnabled),
    issuedAt: new Date(raw.session.createdAt).toISOString(),
    expiresAt: new Date(raw.session.expiresAt).toISOString(),
  };
}

/** Full picture: signed out, waiting for the 2FA code, or signed in. */
export const getAuthState = cache(async (): Promise<AuthState> => {
  const raw = await getRawSession();
  if (!raw) return { status: "signed-out" };
  if (raw.session.twoFactorPending) {
    return { status: "two-factor-pending", email: raw.user.email };
  }
  return { status: "signed-in", session: await toAuthSession(raw) };
});

/**
 * The signed-in account, or null. A session still waiting for its 2FA code
 * counts as signed out everywhere in the app.
 */
export const getSession = cache(async (): Promise<AuthSession | null> => {
  const state = await getAuthState();
  return state.status === "signed-in" ? state.session : null;
});

/** Id of the current Better Auth session row (also while 2FA is pending). */
export async function getCurrentSessionId() {
  const raw = await getRawSession();
  return raw?.session.id ?? null;
}

/**
 * Switches the visible dashboard. The role must belong to the account, so the
 * client cannot manufacture a dashboard it has no access to.
 */
export async function setActiveRole(role: RoleCode) {
  const session = await getSession();

  if (!session || !hasRole(session.roles, role)) {
    return null;
  }

  const cookieStore = await cookies();
  cookieStore.set(env.AUTH_DASHBOARD_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: DASHBOARD_COOKIE_TTL_SECONDS,
  });

  return getDashboardPath(session.roles, role);
}

/** Signs out the current device. The dashboard preference cookie stays. */
export async function clearSession() {
  await auth.api.signOut({ headers: await headers() });
}

/**
 * Signed-in account whose onboarding may still be incomplete. Only the
 * onboarding page and its action use this.
 */
export const getActorAllowIncompleteProfile = cache(
  async (): Promise<AuthSession> => {
    const state = await getAuthState();
    if (state.status === "two-factor-pending") redirect("/two-factor");
    if (state.status === "signed-out") redirect("/login");
    return state.session;
  },
);

/** Returns the signed-in account with a complete profile, or redirects. */
export const getActor = cache(async (): Promise<AuthSession> => {
  const session = await getActorAllowIncompleteProfile();
  if (!session.profileComplete) {
    redirect("/onboarding");
  }
  return session;
});

export function getDashboardPath(
  roles: readonly RoleCode[],
  activeRole?: string,
) {
  return getActiveDashboard(roles, activeRole).path;
}

/** After sign-in or 2FA: onboarding first, then the active dashboard. */
export function getPostSignInPath(session: AuthSession): string {
  if (!session.profileComplete) return "/onboarding";
  return getDashboardPath(session.roles, session.activeRole);
}

/**
 * Enforces one visible dashboard per account. Pages for another role redirect
 * to the dashboard that is currently active instead of rendering twice.
 */
export async function requireDashboard(role: RoleCode) {
  const actor = await getActor();

  if (!hasRole(actor.roles, role) || actor.activeRole !== role) {
    redirect(getDashboardPath(actor.roles, actor.activeRole));
  }

  return actor;
}

/**
 * For Server Actions and route handlers: the account if it is signed in, has
 * finished onboarding, and holds the permission; otherwise null.
 */
export async function getActorWithPermission(
  permission: Permission,
): Promise<AuthSession | null> {
  const actor = await getSession();
  if (!actor || !actor.profileComplete) return null;
  return hasPermission(actor.roles, permission) ? actor : null;
}
