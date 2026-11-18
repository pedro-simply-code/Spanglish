import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { env } from "@/env";
import { canChangeRole, hasRole, type RoleCode } from "@/lib/auth-roles";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import { managerInvitations, users, type ManagerInvitationStatus } from "@/server/db/schema";
import { insertPlatformMessage } from "@/server/messages/mailbox";
import type { AuthSession } from "@/lib/auth-types";

const INVITE_TTL_DAYS = 14;

export type ManagerInvitationRow = {
  id: string;
  email: string;
  status: ManagerInvitationStatus;
  inviteNote: string;
  createdAt: string;
  expiresAt: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findUserByEmail(email: string) {
  const normalized = normalizeEmail(email);
  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.email}) = ${normalized}`)
    .limit(1);
  return rows[0] ?? null;
}

export async function listPendingManagerInvitations(): Promise<ManagerInvitationRow[]> {
  const rows = await db
    .select({
      id: managerInvitations.id,
      email: managerInvitations.email,
      status: managerInvitations.status,
      inviteNote: managerInvitations.inviteNote,
      createdAt: managerInvitations.createdAt,
      expiresAt: managerInvitations.expiresAt,
    })
    .from(managerInvitations)
    .where(eq(managerInvitations.status, "pending"))
    .orderBy(desc(managerInvitations.createdAt));

  const now = Date.now();
  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    status: row.expiresAt.getTime() < now ? "expired" : row.status,
    inviteNote: row.inviteNote,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
  }));
}

export async function getManagerInvitationByToken(token: string) {
  const rows = await db
    .select()
    .from(managerInvitations)
    .where(eq(managerInvitations.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.status !== "pending") return { ...row, open: false as const };
  if (row.expiresAt.getTime() < Date.now()) return { ...row, open: false as const };
  return { ...row, open: true as const };
}

async function applyManagerRole(
  targetUserId: string,
  audit: { actorUserId: string; metadata: Record<string, unknown> },
) {
  const t = await getTranslations("admin");
  const target = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  const row = target[0];
  if (!row) return { ok: false as const, message: t("actions.managers.accountNotFound") };

  if (hasRole(row.roles, "admin"))
    return { ok: false as const, message: t("actions.managers.adminCannotBecomeManager") };
  if (hasRole(row.roles, "manager"))
    return { ok: false as const, message: t("actions.managers.alreadyManager") };

  await db.update(users).set({ roles: ["manager"], updatedAt: new Date() }).where(eq(users.id, targetUserId));

  const ctx = requestContextFromHeaders(await headers());
  await recordAuditEvent({
    action: "role.manager_granted",
    actorUserId: audit.actorUserId,
    targetType: "user",
    targetId: targetUserId,
    metadata: audit.metadata,
    ...ctx,
  });

  return { ok: true as const, message: t("actions.managers.roleGranted") };
}

async function grantManagerRole(actor: AuthSession, targetUserId: string, metadata: Record<string, unknown>) {
  const t = await getTranslations("admin");
  const target = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
  const row = target[0];
  if (!row) return { ok: false as const, message: t("actions.managers.accountNotFound") };

  const decision = canChangeRole(actor.roles, row.roles, { role: "manager", action: "grant" });
  if (!decision.allowed) return { ok: false as const, message: t("actions.managers.roleChangeDenied") };

  return applyManagerRole(targetUserId, { actorUserId: actor.userId, metadata });
}

export async function promoteUserToManagerByEmail(actor: AuthSession, email: string) {
  const t = await getTranslations("admin");
  if (!hasRole(actor.roles, "admin")) {
    return { ok: false as const, message: t("actions.managers.onlyAdminGrant") };
  }

  const user = await findUserByEmail(email);
  if (!user) return { ok: false as const, message: t("actions.managers.noAccountWithEmail") };
  if (!user.emailVerified) {
    return { ok: false as const, message: t("actions.managers.emailNotVerified") };
  }

  return grantManagerRole(actor, user.id, { method: "direct_promote", email: user.email });
}

export async function inviteManager(actor: AuthSession, input: { email: string; note?: string }) {
  const t = await getTranslations("admin");
  if (!hasRole(actor.roles, "admin")) {
    return { ok: false as const, message: t("actions.managers.onlyAdminInvite") };
  }

  const email = normalizeEmail(input.email);
  if (!email.includes("@")) return { ok: false as const, message: t("actions.managers.invalidEmail") };

  const existing = await findUserByEmail(email);
  if (existing && (hasRole(existing.roles, "manager") || hasRole(existing.roles, "admin"))) {
    return { ok: false as const, message: t("actions.managers.alreadyHasAccess") };
  }

  await db
    .update(managerInvitations)
    .set({ status: "revoked" })
    .where(and(eq(managerInvitations.status, "pending"), sql`lower(${managerInvitations.email}) = ${email}`));

  const token = randomUUID();
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  const inviteNote = input.note?.trim() ?? "";

  await db.insert(managerInvitations).values({
    id,
    email,
    token,
    status: "pending",
    invitedByUserId: actor.userId,
    inviteNote,
    expiresAt,
  });

  const joinUrl = `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/join/manager?token=${encodeURIComponent(token)}`;
  const body = [
    "You are invited to join Spanglish as an operations manager.",
    inviteNote ? `\nNote from the admin:\n${inviteNote}\n` : "",
    `Open this link after signing in with ${email}:\n${joinUrl}`,
    `\nThis invitation expires in ${INVITE_TTL_DAYS} days.`,
  ].join("\n");

  let inboxDelivered = false;
  if (existing) {
    await insertPlatformMessage({
      senderUserId: actor.userId,
      recipientUserId: existing.id,
      subject: "Manager invitation",
      body,
    });
    inboxDelivered = true;
  }

  const ctx = requestContextFromHeaders(await headers());
  await recordAuditEvent({
    action: "manager.invited",
    actorUserId: actor.userId,
    targetType: "manager_invitation",
    targetId: id,
    metadata: { email, inboxDelivered, channel: "platform" },
    ...ctx,
  });

  if (inboxDelivered) {
    return {
      ok: true as const,
      message: t("actions.managers.inviteInboxSent"),
    };
  }

  return {
    ok: true as const,
    message: t("actions.managers.inviteSaved", { email }),
  };
}

export async function revokeManagerInvitation(actor: AuthSession, invitationId: string) {
  const t = await getTranslations("admin");
  if (!hasRole(actor.roles, "admin")) {
    return { ok: false as const, message: t("actions.managers.onlyAdminRevokeInvite") };
  }

  await db
    .update(managerInvitations)
    .set({ status: "revoked" })
    .where(and(eq(managerInvitations.id, invitationId), eq(managerInvitations.status, "pending")));

  return { ok: true as const, message: t("actions.managers.inviteRevoked") };
}

export async function acceptManagerInvitation(
  actor: AuthSession,
  input: { token: string; experienceNote: string },
) {
  const t = await getTranslations("admin");
  const invitation = await getManagerInvitationByToken(input.token);
  if (!invitation?.open) {
    return { ok: false as const, message: t("actions.managers.inviteUnavailable") };
  }

  if (normalizeEmail(actor.email) !== normalizeEmail(invitation.email)) {
    return {
      ok: false as const,
      message: t("actions.managers.signInWithInvitedEmail"),
    };
  }

  const experienceNote = input.experienceNote.trim();
  if (experienceNote.length < 20) {
    return { ok: false as const, message: t("actions.managers.experienceTooShort") };
  }

  const grant = await applyManagerRole(actor.userId, {
    actorUserId: actor.userId,
    metadata: { method: "invitation", invitationId: invitation.id, experienceNote },
  });
  if (!grant.ok) return grant;

  await db
    .update(managerInvitations)
    .set({
      status: "accepted",
      acceptedByUserId: actor.userId,
      experienceNote,
      acceptedAt: new Date(),
    })
    .where(eq(managerInvitations.id, invitation.id));

  return { ok: true as const, message: t("actions.managers.welcomeManager") };
}

export async function revokeManagerRole(actor: AuthSession, userId: string) {
  const t = await getTranslations("admin");
  if (!hasRole(actor.roles, "admin")) {
    return { ok: false as const, message: t("actions.managers.onlyAdminRemove") };
  }

  const row = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  const target = row[0];
  if (!target) return { ok: false as const, message: t("actions.managers.accountNotFound") };

  const decision = canChangeRole(actor.roles, target.roles, { role: "manager", action: "revoke" });
  if (!decision.allowed) return { ok: false as const, message: t("actions.managers.roleChangeDenied") };
  if (!hasRole(target.roles, "manager")) {
    return { ok: false as const, message: t("actions.managers.notManager") };
  }

  const nextRoles: RoleCode[] = ["student"];
  await db.update(users).set({ roles: nextRoles, updatedAt: new Date() }).where(eq(users.id, userId));

  const ctx = requestContextFromHeaders(await headers());
  await recordAuditEvent({
    action: "role.manager_revoked",
    actorUserId: actor.userId,
    targetType: "user",
    targetId: userId,
    ...ctx,
  });

  return { ok: true as const, message: t("actions.managers.accessRemoved") };
}