import { randomUUID } from "node:crypto";
import { and, desc, eq, lt } from "drizzle-orm";
import { db } from "@/server/db";
import { auditLogs, users, type AuditSeverity } from "@/server/db/schema";

/** Known audit actions. Keep names stable: dashboards and alerts filter on them. */
export type AuditAction =
  | "auth.sign_up"
  | "auth.sign_in"
  | "auth.sign_in_failed"
  | "auth.rate_limited"
  | "auth.email_verified"
  | "auth.password_changed"
  | "auth.password_reset"
  | "auth.password_created"
  | "auth.two_factor_enabled"
  | "auth.two_factor_disabled"
  | "auth.two_factor_backup_codes_regenerated"
  | "auth.two_factor_lockout"
  | "auth.sessions_revoked"
  | "auth.sign_out"
  | "profile.completed"
  | "profile.updated"
  | "email.bounced"
  | "role.admin_granted"
  | "role.admin_revoked"
  | "role.manager_granted"
  | "role.manager_revoked"
  | "manager.invited"
  | "teacher.invited"
  | "message.sent"
  | "class.booked"
  | "class.canceled"
  | "class.rescheduled"
  | "order.paid"
  | "order.amount_mismatch"
  | "ai_order.paid"
  | "ai_order.amount_mismatch"
  | "ai_pack.saved"
  | "payment.providers_changed"
  | "teacher.stripe_connected"
  | "payout.stripe_sent"
  | "payout.stripe_failed"
  | "credits.granted"
  | "pair.created"
  | "pair.ended"
  | "availability.updated"
  | "recording.saved"
  | "teacher.applied"
  | "teacher.approved"
  | "teacher.rejected"
  | "class.rated"
  | "material.submitted"
  | "material.approved"
  | "material.rejected"
  | "payout.settings_changed"
  | "payout.requested"
  | "payout.created"
  | "payout.approved"
  | "payout.rejected"
  | "payout.paid";

export type AuditEventInput = {
  action: AuditAction;
  actorUserId?: string | null;
  severity?: AuditSeverity;
  targetType?: string;
  targetId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
};

/** Client IP and user agent from request headers (first proxy hop). */
export function requestContextFromHeaders(headers: Headers | null | undefined) {
  if (!headers) return { ipAddress: null, userAgent: null };
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return {
    ipAddress: forwarded || headers.get("x-real-ip")?.trim() || null,
    userAgent: headers.get("user-agent")?.slice(0, 512) || null,
  };
}

/**
 * Writes one audit event. Never throws: auditing must not break sign-in or
 * any other user action.
 */
export async function recordAuditEvent(event: AuditEventInput) {
  try {
    await db.insert(auditLogs).values({
      id: randomUUID(),
      action: event.action,
      actorUserId: event.actorUserId ?? null,
      severity: event.severity ?? "info",
      targetType: event.targetType ?? null,
      targetId: event.targetId ?? null,
      ipAddress: event.ipAddress ?? null,
      userAgent: event.userAgent ?? null,
      metadata: event.metadata ?? null,
    });
  } catch (error) {
    console.error("[audit] could not record event", event.action, error);
  }
}

/**
 * True when this user already signed in before from the same browser/app
 * (same user agent). Used to decide on the "new sign-in" email.
 */
export async function hasSignedInFromDevice(userId: string, userAgent: string) {
  const rows = await db
    .select({ userAgent: auditLogs.userAgent })
    .from(auditLogs)
    .where(and(eq(auditLogs.actorUserId, userId), eq(auditLogs.action, "auth.sign_in")))
    .orderBy(desc(auditLogs.createdAt))
    .limit(50);

  return {
    hasPreviousSignIns: rows.length > 0,
    knownDevice: rows.some((row) => row.userAgent === userAgent),
  };
}

export type AuditListEntry = {
  id: string;
  action: string;
  severity: AuditSeverity;
  actorEmail: string | null;
  actorName: string | null;
  targetType: string | null;
  targetId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

/** Newest first, paged by `before` (ISO date of the last row seen). */
export async function listAuditEvents(options: { limit?: number; before?: string } = {}) {
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const before = options.before ? new Date(options.before) : null;

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      severity: auditLogs.severity,
      actorEmail: users.email,
      actorName: users.name,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      ipAddress: auditLogs.ipAddress,
      userAgent: auditLogs.userAgent,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(before && !Number.isNaN(before.getTime()) ? lt(auditLogs.createdAt, before) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);

  return rows.map(
    (row): AuditListEntry => ({
      ...row,
      metadata: row.metadata ?? null,
      createdAt: row.createdAt.toISOString(),
    }),
  );
}
