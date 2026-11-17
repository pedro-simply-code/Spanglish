import { and, eq, ne, sql } from "drizzle-orm";
import { normalizeRoles } from "@/lib/auth-roles";
import { recordAuditEvent } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";

/*
 * The academy has exactly one admin. The database enforces it with the
 * partial unique index `users_single_admin_idx`, so the role always moves in
 * this order: first taken from everyone else, then given to the new admin.
 *
 * No "server-only" import: `scripts/promote-admin.ts` uses this module too.
 */

export type AdminRoleRequest = {
  /** Why the role moved, stored in the audit log (e.g. "ADMIN_EMAIL"). */
  reason: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AdminHolder = { id: string; email: string };

export async function listAdmins(): Promise<AdminHolder[]> {
  return db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(sql`'admin' = ANY(${users.roles})`);
}

/** Removes the admin role from one account. Returns false if it had none. */
export async function revokeAdminRole(userId: string, request: AdminRoleRequest) {
  const revoked = await db
    .update(users)
    .set({
      // An account left without roles falls back to student.
      roles: sql`CASE WHEN array_remove(${users.roles}, 'admin') = '{}'::text[]
        THEN ARRAY['student']::text[]
        ELSE array_remove(${users.roles}, 'admin') END`,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), sql`'admin' = ANY(${users.roles})`))
    .returning({ id: users.id, email: users.email });

  for (const user of revoked) {
    await recordAuditEvent({
      action: "role.admin_revoked",
      severity: "critical",
      targetType: "user",
      targetId: user.id,
      ipAddress: request.ipAddress ?? null,
      userAgent: request.userAgent ?? null,
      metadata: { reason: request.reason, email: user.email },
    });
  }
  return revoked.length > 0;
}

/**
 * Makes `userId` the only admin: removes the role from every other account,
 * then grants it. Returns the accounts that lost it, or null when the target
 * does not exist.
 */
export async function transferAdminRole(userId: string, request: AdminRoleRequest) {
  const [target] = await db
    .select({ id: users.id, email: users.email, roles: users.roles })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!target) return null;

  const others = await db
    .select({ id: users.id })
    .from(users)
    .where(and(ne(users.id, userId), sql`'admin' = ANY(${users.roles})`));

  const revokedFrom: string[] = [];
  for (const other of others) {
    if (await revokeAdminRole(other.id, request)) revokedFrom.push(other.id);
  }

  const current = target.roles ?? [];
  if (!current.includes("admin") || current.length > 1) {
    // The admin role is exclusive: the account keeps only `admin`.
    await db
      .update(users)
      .set({ roles: normalizeRoles(["admin"]), updatedAt: new Date() })
      .where(eq(users.id, userId));
    await recordAuditEvent({
      action: "role.admin_granted",
      severity: "critical",
      actorUserId: userId,
      targetType: "user",
      targetId: userId,
      ipAddress: request.ipAddress ?? null,
      userAgent: request.userAgent ?? null,
      metadata: { reason: request.reason, email: target.email, revokedFrom },
    });
    return { granted: true, revokedFrom };
  }

  return { granted: false, revokedFrom };
}
