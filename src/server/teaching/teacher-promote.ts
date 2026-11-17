import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { canChangeRole, hasRole, type RoleCode } from "@/lib/auth-roles";
import type { AuthSession } from "@/lib/auth-types";
import { recordAuditEvent, requestContextFromHeaders } from "@/server/audit/audit-log";
import { getActivePairForUser, endPair } from "@/server/classes/pairs";
import { saveTeacherProfile } from "@/server/classes/teachers";
import { db } from "@/server/db";
import {
  classParticipants,
  classSessions,
  teacherApplications,
  teacherInvitations,
  users,
} from "@/server/db/schema";
import { notifyUsers } from "@/server/email/academy-notices";

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

async function assertCanBecomeTeacher(userId: string) {
  const upcoming = await db
    .select({ id: classSessions.id })
    .from(classParticipants)
    .innerJoin(classSessions, eq(classSessions.id, classParticipants.sessionId))
    .where(
      and(
        eq(classParticipants.userId, userId),
        eq(classSessions.status, "scheduled"),
        gt(classSessions.endsAt, new Date()),
      ),
    )
    .limit(1);
  if (upcoming.length) {
    return {
      ok: false as const,
      message: "This account still has upcoming classes as a student. Promote after those classes (or cancel them).",
    };
  }
  return { ok: true as const };
}

export async function promoteUserToTeacherByEmail(actor: AuthSession, email: string) {
  if (!hasRole(actor.roles, "admin")) {
    return { ok: false as const, message: "Only the admin can promote a user directly to teacher." };
  }

  const user = await findUserByEmail(email);
  if (!user) return { ok: false as const, message: "No account with that email." };
  if (!user.emailVerified) {
    return { ok: false as const, message: "The account must verify email before becoming a teacher." };
  }

  const targetRoles = user.roles as RoleCode[];
  if (hasRole(targetRoles, "teacher")) {
    return { ok: false as const, message: "This account is already a teacher." };
  }
  if (hasRole(targetRoles, "admin") || hasRole(targetRoles, "manager")) {
    return { ok: false as const, message: "Managers and admins cannot be promoted to teacher." };
  }
  if (!hasRole(targetRoles, "student")) {
    return { ok: false as const, message: "Only student accounts can become teachers." };
  }

  const decision = canChangeRole(actor.roles, targetRoles, { role: "teacher", action: "grant" });
  if (!decision.allowed) return { ok: false as const, message: decision.reason };

  const ready = await assertCanBecomeTeacher(user.id);
  if (!ready.ok) return ready;

  const pair = await getActivePairForUser(user.id);
  if (pair) await endPair(pair.id, actor.userId);

  await db.update(users).set({ roles: ["teacher"], updatedAt: new Date() }).where(eq(users.id, user.id));

  const headline = user.name?.trim() ? `${user.name.trim()} · Spanglish teacher` : "Spanglish teacher";
  await saveTeacherProfile(user.id, {
    headline: headline.slice(0, 120),
    bio: "",
    country: "",
    tags: [],
  });

  await db
    .update(teacherApplications)
    .set({
      status: "approved",
      reviewerUserId: actor.userId,
      reviewNote: "Direct promotion by admin.",
      reviewedAt: new Date(),
    })
    .where(and(eq(teacherApplications.userId, user.id), eq(teacherApplications.status, "submitted")));

  await db
    .update(teacherInvitations)
    .set({ status: "accepted", acceptedAt: new Date() })
    .where(
      and(
        eq(teacherInvitations.status, "pending"),
        sql`lower(${teacherInvitations.email}) = ${normalizeEmail(user.email)}`,
      ),
    );

  const ctx = requestContextFromHeaders(await headers());
  await recordAuditEvent({
    action: "teacher.approved",
    severity: "warning",
    actorUserId: actor.userId,
    targetType: "user",
    targetId: user.id,
    metadata: { method: "direct_promote", email: user.email },
    ...ctx,
  });
  notifyUsers("application-approved", [user.id]);

  return {
    ok: true as const,
    message: "Teacher role granted. They can set availability and profile in the teacher dashboard.",
  };
}