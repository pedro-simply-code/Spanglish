import { env } from "@/env";
import { normalizeRoles, type RoleCode } from "@/lib/auth-roles";
import { normalizeEmail } from "@/lib/auth-validation";
import { revokeAdminRole, transferAdminRole } from "@/server/auth/admin-role";
import { notifyUser } from "@/server/auth/auth-events";

/**
 * The academy owner: the account whose email matches `ADMIN_EMAIL`. When the
 * variable is set, that account is the only admin:
 * - it receives the admin role the first time it signs in with a verified
 *   email (Google, email code, or email + password after the email code);
 * - every other account loses the admin role: in the session at once, and in
 *   the database when the owner gets it (or at that account's next sign-in).
 * Without `ADMIN_EMAIL`, admin roles come only from the database (seed).
 */
export const ownerEmail = env.ADMIN_EMAIL ? normalizeEmail(env.ADMIN_EMAIL) : null;

export function isOwnerEmail(email: string) {
  return ownerEmail !== null && normalizeEmail(email) === ownerEmail;
}

/** Roles as they must be enforced for this account. */
export function enforceOwnerRoles(email: string, roles: readonly RoleCode[]): RoleCode[] {
  if (!ownerEmail || isOwnerEmail(email)) return [...roles];
  return normalizeRoles(roles.filter((role) => role !== "admin"));
}

type OwnerCheckUser = {
  id: string;
  email: string;
  emailVerified: boolean;
  roles: string[] | null;
};

/**
 * Brings the stored roles in line with `ADMIN_EMAIL` when a session starts:
 * the owner (verified email only) becomes the only admin; any other account
 * that still holds the role loses it.
 */
export async function syncOwnerRoles(
  user: OwnerCheckUser,
  request: { ipAddress?: string | null; userAgent?: string | null },
) {
  if (!ownerEmail) return;

  const current = normalizeRoles(user.roles ?? []);
  const roleRequest = { reason: "ADMIN_EMAIL", ...request };

  if (isOwnerEmail(user.email)) {
    if (!user.emailVerified || current.includes("admin")) return;
    const result = await transferAdminRole(user.id, roleRequest);
    if (result?.granted) notifyUser(user.id, "admin-granted");
    return;
  }

  if (current.includes("admin")) {
    await revokeAdminRole(user.id, roleRequest);
  }
}
