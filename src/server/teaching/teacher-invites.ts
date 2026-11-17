import "server-only";

import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { env } from "@/env";
import { hasRole, type RoleCode } from "@/lib/auth-roles";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { db } from "@/server/db";
import { teacherApplications, teacherInvitations, users, type TeacherInvitationStatus } from "@/server/db/schema";
import { insertPlatformMessage } from "@/server/messages/mailbox";

const INVITE_TTL_DAYS = 14;

export type TeacherInvitationRow = {
  id: string;
  email: string;
  status: TeacherInvitationStatus;
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

function canInviteTeachers(actor: AuthSession) {
  return hasRole(actor.roles, "admin") || hasRole(actor.roles, "manager");
}

export async function listPendingTeacherInvitations(): Promise<TeacherInvitationRow[]> {
  const rows = await db
    .select({
      id: teacherInvitations.id,
      email: teacherInvitations.email,
      status: teacherInvitations.status,
      inviteNote: teacherInvitations.inviteNote,
      createdAt: teacherInvitations.createdAt,
      expiresAt: teacherInvitations.expiresAt,
    })
    .from(teacherInvitations)
    .where(eq(teacherInvitations.status, "pending"))
    .orderBy(desc(teacherInvitations.createdAt));

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

export async function inviteTeacherApplicant(actor: AuthSession, input: { email: string; note?: string }) {
  if (!canInviteTeachers(actor)) {
    return { ok: false as const, message: "Only managers and the admin can invite teachers." };
  }

  const email = normalizeEmail(input.email);
  if (!email.includes("@")) return { ok: false as const, message: "Enter a valid email address." };

  const existing = await findUserByEmail(email);
  if (existing) {
    const roles = existing.roles as RoleCode[];
    if (hasRole(roles, "teacher")) {
      return { ok: false as const, message: "This account is already a teacher." };
    }
    if (hasRole(roles, "admin") || hasRole(roles, "manager")) {
      return { ok: false as const, message: "Managers and admins cannot apply through this flow." };
    }

    const openApp = await db
      .select({ id: teacherApplications.id })
      .from(teacherApplications)
      .where(and(eq(teacherApplications.userId, existing.id), eq(teacherApplications.status, "submitted")))
      .limit(1);
    if (openApp.length > 0) {
      return { ok: false as const, message: "This person already has an application under review." };
    }
  }

  await db
    .update(teacherInvitations)
    .set({ status: "revoked" })
    .where(and(eq(teacherInvitations.status, "pending"), sql`lower(${teacherInvitations.email}) = ${email}`));

  const id = randomUUID();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000);
  const inviteNote = input.note?.trim() ?? "";

  await db.insert(teacherInvitations).values({
    id,
    email,
    status: "pending",
    invitedByUserId: actor.userId,
    inviteNote,
    expiresAt,
  });

  const appBase = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const applyUrl = `${appBase}/apply`;
  const body = [
    "You are invited to apply as a teacher at Spanglish.",
    inviteNote ? `\nNote from the academy:\n${inviteNote}\n` : "",
    `Sign in with ${email} (student account), then open:`,
    applyUrl,
    "\nComplete the application form. We will review it in Teacher applications.",
    `\nThis invitation expires in ${INVITE_TTL_DAYS} days.`,
  ].join("\n");

  let inboxDelivered = false;
  if (existing) {
    await insertPlatformMessage({
      senderUserId: actor.userId,
      recipientUserId: existing.id,
      subject: "Teacher application invitation",
      body,
    });
    inboxDelivered = true;
  }

  const ctx = requestContextFromHeaders(await headers());
  await recordAuditEvent({
    action: "teacher.invited",
    actorUserId: actor.userId,
    targetType: "teacher_invitation",
    targetId: id,
    metadata: { email, inboxDelivered, channel: "platform" },
    ...ctx,
  });

  if (inboxDelivered) {
    return {
      ok: true as const,
      message: "Invitation saved and sent to their Spanglish inbox (Email in the app).",
    };
  }

  return {
    ok: true as const,
    message: `Invitation saved for ${email}. When they register with that address, they can open Email or go to ${applyUrl}.`,
  };
}

export async function revokeTeacherInvitation(actor: AuthSession, invitationId: string) {
  if (!canInviteTeachers(actor)) {
    return { ok: false as const, message: "Only managers and the admin can revoke invitations." };
  }

  await db
    .update(teacherInvitations)
    .set({ status: "revoked" })
    .where(and(eq(teacherInvitations.id, invitationId), eq(teacherInvitations.status, "pending")));

  return { ok: true as const, message: "Invitation revoked." };
}

export async function markTeacherInvitationSubmitted(email: string, applicationId: string) {
  const normalized = normalizeEmail(email);
  await db
    .update(teacherInvitations)
    .set({
      status: "accepted",
      acceptedAt: new Date(),
      acceptedApplicationId: applicationId,
    })
    .where(and(eq(teacherInvitations.status, "pending"), sql`lower(${teacherInvitations.email}) = ${normalized}`));
}